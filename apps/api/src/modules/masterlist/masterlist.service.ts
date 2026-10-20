import { CensusCategory, CensusHistoryRow, MasterlistResponse, MasterlistRow } from '@brgy/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RequestUser } from '../../common/decorators';
import { AuditService } from '../audit/audit.service';
import { ResidentProfile } from '../users/resident-profile.entity';
import { User } from '../users/user.entity';
import { CsvFormatError, validateCensusCsv, type ValidRow } from './census-csv';
import { CensusRecordHistory } from './census-history.entity';
import { CensusRecord } from './census-record.entity';
import { Household } from './household.entity';

interface RecordInput {
  fullName: string;
  birthdate?: string;
  address: string;
  purok?: string;
  category: CensusCategory;
  lguEligibility?: string;
  householdCode?: string;
}

/** One row that was accepted by validation but not written, and why. */
interface SkippedRow {
  row: number;
  name: string;
  reason: string;
}

export interface ImportOutcome {
  added: number;
  updated: number;
  /** Matched an existing resident under a changed surname (e.g. marriage). */
  renamed: number;
  deactivated: number;
  skipped: number;
  skippedRows: SkippedRow[];
}


/** Name parts, upper-cased and stripped of punctuation, for loose comparison. */
function nameParts(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ\s]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 1);
}

/**
 * Is this plausibly the same person under a different name?
 *
 * Marriage changes a surname while the given names and birthdate stay put, so
 * exact-name matching treats the same resident as a new person: the old record
 * is deactivated by a refresh (locking out her account) and a fresh, unclaimed
 * duplicate of her identity appears. Requiring the birthdate to match and at
 * least two shared name parts catches the rename without merging two genuinely
 * different residents who happen to share a birthday.
 */
function looksLikeSamePerson(a: string, b: string): boolean {
  const pa = nameParts(a);
  const pb = nameParts(b);
  const shared = pa.filter((p) => pb.includes(p));
  return shared.length >= 2;
}

/** Drop the spreadsheet line number — the write path doesn't care about it. */
function toRecordInput({ line: _line, ...rest }: ValidRow): RecordInput {
  return rest;
}

@Injectable()
export class MasterlistService {
  constructor(
    @InjectRepository(CensusRecord) private readonly census: Repository<CensusRecord>,
    @InjectRepository(Household) private readonly households: Repository<Household>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    @InjectRepository(CensusRecordHistory)
    private readonly history: Repository<CensusRecordHistory>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  /** Snapshot a record's current values before they change (accordion history). */
  private async snapshot(record: CensusRecord, note: string, changedBy: string): Promise<void> {
    await this.history.insert({
      censusRecordId: record.id,
      address: record.address,
      purok: record.purok,
      category: record.category,
      lguEligibility: record.lguEligibility,
      householdCode: record.household?.code ?? null,
      wasActive: record.isActive,
      note,
      changedBy,
    });
  }

  /** Keep the portal account's display name in step with a census rename. */
  private async renameLinkedAccount(censusRecordId: string, newName: string, oldName: string): Promise<void> {
    const profile = await this.profiles.findOne({
      where: { censusRecordId },
      relations: { user: true },
    });
    if (!profile?.user) return;
    await this.users.update({ id: profile.user.id }, { fullName: newName });
    this.audit.log({
      actorLabel: 'Census Refresh',
      action: 'Renamed Resident Account',
      target: `${oldName} → ${newName}`,
    });
  }

  /** Enable/disable the portal account linked to a census record (census cascade). */
  private async setLinkedAccountActive(censusRecordId: string, active: boolean, reason: string): Promise<void> {
    const profile = await this.profiles.findOne({
      where: { censusRecordId },
      relations: { user: true },
    });
    if (!profile?.user || profile.user.isActive === active) return;
    await this.users.update({ id: profile.user.id }, { isActive: active });
    this.audit.log({
      actorLabel: 'Census Refresh',
      action: active ? 'Reactivated Resident Account' : 'Deactivated Resident Account',
      target: `${profile.user.fullName} — ${reason}`,
    });
  }

  private async toRows(records: CensusRecord[]): Promise<MasterlistRow[]> {
    const ids = records.map((r) => r.id);
    const claims = ids.length
      ? await this.profiles.find({
          where: { censusRecordId: In(ids) },
          relations: { user: true },
        })
      : [];
    const claimedSet = new Set(claims.map((c) => c.censusRecordId));
    const activeByCensus = new Map(claims.map((c) => [c.censusRecordId, c.user?.isActive ?? null]));
    const withHistory = ids.length
      ? await this.history
          .createQueryBuilder('h')
          .select('DISTINCT h.census_record_id', 'censusId')
          .where('h.census_record_id IN (:...ids)', { ids })
          .getRawMany<{ censusId: string }>()
      : [];
    const historySet = new Set(withHistory.map((h) => h.censusId));
    return records.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      address: r.address,
      purok: r.purok,
      birthdate: r.birthdate,
      category: r.category,
      lguEligibility: r.lguEligibility,
      householdCode: r.household?.code ?? null,
      registered: claimedSet.has(r.id),
      accountActive: claimedSet.has(r.id) ? (activeByCensus.get(r.id) ?? null) : null,
      isActive: r.isActive,
      hasHistory: historySet.has(r.id),
    }));
  }

  async recordHistory(censusRecordId: string): Promise<CensusHistoryRow[]> {
    const rows = await this.history.find({
      where: { censusRecordId },
      order: { changedAt: 'DESC' },
      take: 25,
    });
    return rows.map((h) => ({
      id: h.id,
      address: h.address,
      purok: h.purok,
      category: h.category,
      lguEligibility: h.lguEligibility,
      householdCode: h.householdCode,
      wasActive: h.wasActive,
      note: h.note,
      changedBy: h.changedBy,
      changedAt: h.changedAt.toISOString(),
    }));
  }

  async list(
    search: string,
    page: number,
    pageSize: number,
    category?: CensusCategory,
    account?: 'registered' | 'none',
    status?: 'active' | 'inactive',
  ): Promise<MasterlistResponse> {
    const qb = this.census
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.household', 'h')
      .orderBy('h.code', 'ASC')
      .addOrderBy('c.fullName', 'ASC');
    if (search.trim()) {
      qb.andWhere('(c.full_name LIKE :s OR c.address LIKE :s OR h.code LIKE :s)', {
        s: `%${search.trim()}%`,
      });
    }
    if (category) qb.andWhere('c.category = :category', { category });
    if (status === 'active') qb.andWhere('c.is_active = 1');
    if (status === 'inactive') qb.andWhere('c.is_active = 0');
    if (account === 'registered' || account === 'none') {
      qb.andWhere(
        `${account === 'registered' ? '' : 'NOT '}EXISTS (SELECT 1 FROM resident_profiles p WHERE p.census_record_id = c.id)`,
      );
    }
    const [records, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const householdCount = await this.households.count();
    return { items: await this.toRows(records), total, page, pageSize, householdCount };
  }

  /** Find-or-create the household for a code (auto-generates HH-xxxx when blank). */
  private async resolveHousehold(
    code: string | undefined,
    address: string,
    purok: string | null,
  ): Promise<Household> {
    if (code?.trim()) {
      const existing = await this.households.findOne({ where: { code: code.trim().toUpperCase() } });
      if (existing) return existing;
      return this.households.save(
        this.households.create({ code: code.trim().toUpperCase(), address, purok }),
      );
    }
    return this.households.save(
      this.households.create({ code: await this.nextHouseholdCode(), address, purok }),
    );
  }

  /**
   * Next free auto household code.
   *
   * This used to be `HH-{count + 1}`, which collides the moment the existing
   * codes aren't a gapless 1..N run — and they never stay that way once a CSV
   * supplies explicit codes. The duplicate-key error surfaced as a 500 on an
   * otherwise valid import. Derive from the highest code in use instead.
   */
  private async nextHouseholdCode(): Promise<string> {
    const rows = await this.households.createQueryBuilder('h').select('h.code', 'code').getRawMany<{ code: string }>();
    const used = new Set(rows.map((r) => r.code));
    const highest = rows.reduce((max, r) => {
      const n = /^HH-(\d+)$/.exec(r.code ?? '');
      return n ? Math.max(max, Number(n[1])) : max;
    }, 0);
    let next = highest + 1;
    while (used.has(`HH-${String(next).padStart(4, '0')}`)) next++;
    return `HH-${String(next).padStart(4, '0')}`;
  }

  async addRecord(input: RecordInput, actor: RequestUser, quiet = false): Promise<MasterlistRow> {
    const dup = await this.census
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.full_name)) = LOWER(:name)', { name: input.fullName.trim() })
      .andWhere(input.birthdate ? 'c.birthdate = :bd' : '1=1', { bd: input.birthdate })
      .getOne();
    if (dup) throw new BadRequestException(`${input.fullName} is already in the census.`);

    const household = await this.resolveHousehold(
      input.householdCode,
      input.address,
      input.purok ?? null,
    );
    const record = await this.census.save(
      this.census.create({
        fullName: input.fullName.trim(),
        birthdate: input.birthdate ?? null,
        address: input.address,
        purok: input.purok ?? null,
        category: input.category,
        lguEligibility: input.lguEligibility ?? null,
        householdId: household.id,
      }),
    );
    record.household = household;
    if (!quiet) {
      this.audit.log({
        actorLabel: `${actor.fullName} (Staff)`,
        actorId: actor.id,
        action: 'Added Census Record',
        target: `${record.fullName} · ${household.code}`,
      });
    }
    return (await this.toRows([record]))[0];
  }

  /**
   * Staff edit of a single census record. Snapshots the old values first so the
   * history accordion shows what changed, then keeps any linked resident
   * profile in sync (the census is the source of truth for address/purok).
   */
  async updateRecord(id: string, input: RecordInput, actor: RequestUser): Promise<MasterlistRow> {
    const existing = await this.census.findOne({ where: { id }, relations: { household: true } });
    if (!existing) throw new NotFoundException('Census record not found.');

    // Another person must not already hold this name + birthdate.
    const dup = await this.census
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.full_name)) = LOWER(:name)', { name: input.fullName.trim() })
      .andWhere('c.id != :id', { id })
      .andWhere(input.birthdate ? 'c.birthdate = :bd' : '1=1', { bd: input.birthdate })
      .getOne();
    if (dup) throw new BadRequestException(`${input.fullName} is already in the census.`);

    const household = await this.resolveHousehold(
      input.householdCode,
      input.address,
      input.purok ?? null,
    );
    await this.snapshot(existing, 'Edited by staff', `${actor.fullName} (Staff)`);
    await this.census.update(
      { id },
      {
        fullName: input.fullName.trim(),
        birthdate: input.birthdate ?? null,
        address: input.address,
        purok: input.purok ?? null,
        category: input.category,
        lguEligibility: input.lguEligibility ?? null,
        householdId: household.id,
      },
    );
    await this.profiles.update(
      { censusRecordId: id },
      { address: input.address, purok: input.purok ?? null },
    );

    this.audit.log({
      actorLabel: `${actor.fullName} (Staff)`,
      actorId: actor.id,
      action: 'Edited Census Record',
      target: `${input.fullName.trim()} · ${household.code}`,
    });
    const updated = await this.census.findOne({ where: { id }, relations: { household: true } });
    return (await this.toRows([updated as CensusRecord]))[0];
  }

  /**
   * Permanently remove a census record and its change history.
   *
   * Refused while a portal account is linked: the profile's census_record_id is
   * ON DELETE SET NULL, so deleting would silently strip the resident's census
   * link (and their verification basis) while leaving the account able to sign
   * in. Deactivating is the correct move there — it cascades to the account.
   */
  async deleteRecord(id: string, actor: RequestUser): Promise<{ id: string }> {
    const record = await this.census.findOne({ where: { id }, relations: { household: true } });
    if (!record) throw new NotFoundException('Census record not found.');

    const linked = await this.profiles.findOne({
      where: { censusRecordId: id },
      relations: { user: true },
    });
    if (linked) {
      throw new BadRequestException(
        `${record.fullName} has a registered portal account (${linked.user?.email ?? 'linked'}). Mark the record inactive instead, or remove the account first.`,
      );
    }

    await this.history.delete({ censusRecordId: id });
    await this.census.remove(record);

    this.audit.log({
      actorLabel: `${actor.fullName} (Staff)`,
      actorId: actor.id,
      action: 'Deleted Census Record',
      target: `${record.fullName} · ${record.household?.code ?? '—'}`,
    });
    return { id };
  }

  /**
   * CSV import. Header: fullName,birthdate,address,purok,category,lguEligibility,householdCode
   *
   * mode 'append'  — add new people only; existing records untouched (safe for partial lists).
   * mode 'refresh' — the twice-yearly census sync: the CSV is the full current census.
   *                  Matched records (name+birthdate) are UPDATED (address, category,
   *                  household…), new people are ADDED, and records missing from the CSV
   *                  are DEACTIVATED (never deleted — accounts/history stay linked).
   */
  async importCsv(
    csv: string,
    actor: RequestUser,
    mode: 'append' | 'refresh' = 'append',
  ): Promise<ImportOutcome> {
    let checked;
    try {
      checked = validateCensusCsv(csv);
    } catch (err) {
      if (err instanceof CsvFormatError) {
        throw new BadRequestException({
          message: err.message,
          hint: err.hint,
          errors: [],
          totalErrors: 0,
        });
      }
      throw err;
    }

    // All-or-nothing: a file with bad rows is rejected outright rather than
    // half-applied, so the operator fixes the spreadsheet and re-uploads a
    // file they can trust. Refresh mode especially — a mid-import failure
    // there would leave real residents wrongly deactivated.
    if (checked.issues.length) {
      const shown = checked.issues.length;
      throw new BadRequestException({
        message:
          checked.totalIssues === 1
            ? 'Found 1 problem in the file — nothing was imported.'
            : `Found ${checked.totalIssues} problems in the file — nothing was imported.`,
        hint:
          checked.totalIssues > shown
            ? `Showing the first ${shown}. Fix these and re-upload to see the rest.`
            : 'Fix the rows listed above and upload the file again.',
        errors: checked.issues,
        totalErrors: checked.totalIssues,
      });
    }

    const syncedAt = new Date();
    const seenIds = new Set<string>();
    const skippedRows: SkippedRow[] = [];
    let added = 0;
    let updated = 0;
    let renamed = 0;

    for (const input of checked.rows) {
      let existing = await this.census
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.household', 'h')
        .where('LOWER(TRIM(c.full_name)) = LOWER(:name)', { name: input.fullName })
        .andWhere(input.birthdate ? 'c.birthdate = :bd' : '1=1', { bd: input.birthdate })
        .getOne();

      // Exact name missed. Before concluding this is a new resident, check for
      // the same birthdate under a different surname — a marriage, not a new
      // person. Without this the old record is deactivated on refresh (locking
      // the resident out) while an unclaimed duplicate of her appears.
      let renamedFrom: string | null = null;
      if (!existing && input.birthdate) {
        const sameBirthday = await this.census
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.household', 'h')
          .where('c.birthdate = :bd', { bd: input.birthdate })
          .andWhere('c.is_active = 1')
          .getMany();
        const candidates = sameBirthday.filter((c) => looksLikeSamePerson(c.fullName, input.fullName));
        if (candidates.length === 1) {
          existing = candidates[0];
          renamedFrom = candidates[0].fullName;
        } else if (candidates.length > 1) {
          // Two plausible matches is a judgement call, not an import decision.
          skippedRows.push({
            row: input.line,
            name: input.fullName,
            reason: `Matches ${candidates.length} existing residents with the same birthdate — resolve this record at the Barangay Hall before importing.`,
          });
          continue;
        }
      }

      if (existing) {
        seenIds.add(existing.id);
        if (mode === 'refresh') {
          if (renamedFrom) {
            await this.snapshot(existing, `Renamed from "${renamedFrom}" during census refresh`, `${actor.fullName} (Staff)`);
            await this.census.update({ id: existing.id }, { fullName: input.fullName });
            await this.renameLinkedAccount(existing.id, input.fullName, renamedFrom);
            renamed++;
          }
          await this.updateFromCensus(existing, toRecordInput(input), syncedAt, `${actor.fullName} (Staff)`);
          updated++;
        } else {
          skippedRows.push({ row: input.line, name: input.fullName, reason: 'Already in the census.' });
        }
        continue;
      }

      try {
        const created = await this.addRecord(toRecordInput(input), actor, true);
        seenIds.add(created.id);
        added++;
      } catch (err) {
        // Validation ran first, so this is unexpected — surface the reason
        // instead of silently inflating the "skipped" count.
        skippedRows.push({
          row: input.line,
          name: input.fullName,
          reason: err instanceof BadRequestException ? String(err.message) : 'Could not be saved.',
        });
      }
    }

    let deactivated = 0;
    if (mode === 'refresh') {
      const missing = await this.census
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.household', 'h')
        .where('c.is_active = 1')
        .andWhere(seenIds.size ? 'c.id NOT IN (:...seen)' : '1=1', { seen: [...seenIds] })
        .getMany();
      // A claimed record belongs to someone who has already registered and
      // verified. Deactivating it signs them out of the portal, and the trigger
      // would be a row missing from a spreadsheet — which validation cannot
      // distinguish from a clerical deletion. Flag those for staff instead of
      // acting on them; unclaimed records still deactivate automatically.
      const claimedIds = new Set(
        (
          await this.profiles.find({
            where: { censusRecordId: In(missing.map((r) => r.id)) },
          })
        ).map((p) => p.censusRecordId),
      );
      for (const record of missing) {
        if (claimedIds.has(record.id)) {
          skippedRows.push({
            row: 0,
            name: record.fullName,
            reason:
              'Missing from this file but linked to a registered account — left active. Deactivate from the Masterlist if the resident has genuinely moved out.',
          });
          continue;
        }
        await this.snapshot(record, 'Deactivated — missing from census refresh', `${actor.fullName} (Staff)`);
        await this.census.update({ id: record.id }, { isActive: false });
        // Census inactive → the linked portal account can no longer sign in.
        await this.setLinkedAccountActive(record.id, false, 'removed in census refresh');
        deactivated++;
      }
    }

    this.audit.log({
      actorLabel: `${actor.fullName} (Staff)`,
      actorId: actor.id,
      action: mode === 'refresh' ? 'Ran Census Refresh' : 'Imported Census CSV',
      target: `${added} added, ${updated} updated, ${renamed} renamed, ${deactivated} deactivated, ${skippedRows.length} skipped`,
    });
    return { added, updated, renamed, deactivated, skipped: skippedRows.length, skippedRows };
  }

  /** Refresh-update one census record and keep any linked resident profile in sync. */
  private async updateFromCensus(
    existing: CensusRecord,
    input: RecordInput,
    syncedAt: Date,
    changedBy: string,
  ): Promise<void> {
    const household = await this.resolveHousehold(input.householdCode, input.address, input.purok ?? null);

    const reactivated = !existing.isActive;
    const changed =
      existing.address !== input.address ||
      (existing.purok ?? null) !== (input.purok ?? null) ||
      existing.category !== input.category ||
      (existing.lguEligibility ?? null) !== (input.lguEligibility ?? null) ||
      existing.householdId !== household.id;

    // Keep the accordion history: snapshot old values before overwriting.
    if (changed || reactivated) {
      await this.snapshot(
        existing,
        reactivated ? 'Reactivated — reappeared in census refresh' : 'Updated by census refresh',
        changedBy,
      );
    }

    await this.census.update(
      { id: existing.id },
      {
        address: input.address,
        purok: input.purok ?? null,
        category: input.category,
        lguEligibility: input.lguEligibility ?? null,
        householdId: household.id,
        isActive: true, // reappearing in the census reactivates the record
        lastSyncedAt: syncedAt,
      },
    );
    // Linked account inherits the refreshed address/purok (census is the source of truth).
    await this.profiles.update(
      { censusRecordId: existing.id },
      { address: input.address, purok: input.purok ?? null },
    );
    if (reactivated) {
      await this.setLinkedAccountActive(existing.id, true, 'reappeared in census refresh');
    }
  }

  async exportCsv(): Promise<string> {
    const records = await this.census.find({ relations: { household: true }, order: { fullName: 'ASC' } });
    const rows = await this.toRows(records);
    const esc = (v: string | boolean | null) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const header = 'fullName,birthdate,address,purok,category,lguEligibility,householdCode,registered';
    return [
      header,
      ...rows.map((r) =>
        [r.fullName, r.birthdate, r.address, r.purok, r.category, r.lguEligibility, r.householdCode, r.registered]
          .map(esc)
          .join(','),
      ),
    ].join('\n');
  }
}
