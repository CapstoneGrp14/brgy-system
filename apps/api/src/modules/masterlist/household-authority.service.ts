import { DependantDto } from '@brgy/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ResidentProfile } from '../users/resident-profile.entity';
import { CensusRecord } from './census-record.entity';
import { Household } from './household.entity';

/**
 * Who a resident may transact for.
 *
 * Shared by every service that accepts a beneficiary — documents, bookings and
 * printing — so the rule is defined once. Duplicating it per module is how the
 * three drift apart and one of them ends up trusting the client.
 */
@Injectable()
export class HouseholdAuthorityService {
  constructor(
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    @InjectRepository(CensusRecord) private readonly census: Repository<CensusRecord>,
    @InjectRepository(Household) private readonly households: Repository<Household>,
  ) {}

  /** Age in whole years from an ISO birthdate. */
  private static ageFrom(birthdate: string | Date | null): number | null {
    if (!birthdate) return null;
    const bd = new Date(String(birthdate).slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(bd.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
    return age;
  }

  /**
   * Minors in the caller's household that they may transact for.
   *
   * Only the head of the household gets a non-empty list. Members qualify when
   * they are under 18 AND hold no portal account — a registered teenager acts
   * for themselves, so listing them would let the head act for someone able to
   * act for themselves.
   */
  async dependantsFor(userId: string): Promise<DependantDto[]> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile?.censusRecordId) return [];

    const household = await this.households.findOne({
      where: { headCensusRecordId: profile.censusRecordId },
    });
    if (!household) return []; // not a head of family

    const members = await this.census.find({
      where: { householdId: household.id, isActive: true },
    });
    const claimed = new Set(
      (
        await this.profiles.find({
          where: { censusRecordId: In(members.map((m) => m.id)) },
        })
      ).map((p) => p.censusRecordId),
    );

    return members
      .filter((m) => m.id !== profile.censusRecordId && !claimed.has(m.id))
      .map((m) => ({ record: m, age: HouseholdAuthorityService.ageFrom(m.birthdate) }))
      .filter((x): x is { record: CensusRecord; age: number } => x.age !== null && x.age < 18)
      .map(({ record, age }) => ({ censusRecordId: record.id, fullName: record.fullName, age }));
  }

  /**
   * Confirm the caller may transact for this census record, and return its name.
   * Re-derives the list rather than trusting the submitted id, so a crafted
   * request cannot name an arbitrary resident.
   */
  async resolveBeneficiary(userId: string, censusRecordId: string): Promise<string> {
    const allowed = await this.dependantsFor(userId);
    const hit = allowed.find((d) => d.censusRecordId === censusRecordId);
    if (!hit) {
      throw new ForbiddenException(
        'You can only transact on behalf of a minor in your own household, and only as its registered head of family.',
      );
    }
    return hit.fullName;
  }
}
