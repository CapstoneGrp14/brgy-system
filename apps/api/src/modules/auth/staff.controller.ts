import { createHash, randomUUID } from 'crypto';
import { Role, STAFF_POSITIONS, StaffInviteRow, VerificationStatus } from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { AuditService } from '../audit/audit.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { CensusRecord } from '../masterlist/census-record.entity';
import { ResidentProfile } from '../users/resident-profile.entity';
import { User } from '../users/user.entity';
import { StaffInvite } from './staff-invite.entity';

class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsIn([Role.EMPLOYEE, Role.ADMIN])
  role: Role.EMPLOYEE | Role.ADMIN;

  @IsIn(STAFF_POSITIONS as unknown as string[])
  position: string;
}

@Roles(Role.ADMIN)
@Controller('staff')
export class StaffController {
  constructor(
    @InjectRepository(StaffInvite) private readonly invites: Repository<StaffInvite>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    @InjectRepository(CensusRecord) private readonly census: Repository<CensusRecord>,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const [staff, invites] = await Promise.all([
      this.users.find({
        where: { role: In([Role.EMPLOYEE, Role.ADMIN]) },
        order: { createdAt: 'ASC' },
      }),
      this.invites.find({ order: { createdAt: 'DESC' } }),
    ]);
    return {
      staff: staff.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        position: u.position,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      })),
      invites: invites.map(
        (i): StaffInviteRow => ({
          id: i.id,
          email: i.email,
          fullName: i.fullName,
          role: i.role,
          position: i.position,
          invitedBy: i.invitedBy,
          expiresAt: i.expiresAt.toISOString(),
          acceptedAt: i.acceptedAt?.toISOString() ?? null,
          revokedAt: i.revokedAt?.toISOString() ?? null,
          createdAt: i.createdAt.toISOString(),
        }),
      ),
    };
  }

  @Post('invites')
  async invite(@Body() dto: CreateInviteDto, @CurrentUser() user: RequestUser) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.role === Role.RESIDENT) {
        // Signal the UI that this resident can be promoted instead of invited.
        throw new BadRequestException({
          message: `${existingUser.fullName} already has a resident account — promote it to staff instead of inviting.`,
          promotable: true,
          fullName: existingUser.fullName,
        });
      }
      throw new BadRequestException('This email already belongs to a staff account.');
    }
    const pending = await this.invites.findOne({
      where: { email, acceptedAt: IsNull(), revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
    if (pending) throw new BadRequestException('There is already a pending invite for this email.');

    const token = randomUUID() + randomUUID();
    await this.invites.save(
      this.invites.create({
        email,
        fullName: dto.fullName.trim(),
        role: dto.role,
        position: dto.position,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        invitedBy: user.fullName,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      }),
    );

    const webUrl = this.config.get('WEB_URL', 'http://localhost:5173');
    await this.queue.publish(QUEUES.email, {
      to: email,
      subject: `Barangay 591 — You're invited as ${dto.position}`,
      html: `
        <p>Hi ${dto.fullName},</p>
        <p>${user.fullName} invited you to the Barangay 591 e-Services Portal as
        <strong>${dto.position}</strong> (${dto.role === Role.ADMIN ? 'Administrator' : 'Staff'} access).</p>
        <p><a href="${webUrl}/accept-invite?token=${token}">Set up your account</a>
        (link valid for 7 days).</p>
        <p>If you weren't expecting this, you can ignore this email.</p>`,
    });

    this.audit.log({
      actorLabel: `${user.fullName} (Admin)`,
      actorId: user.id,
      action: 'Invited Staff Member',
      target: `${dto.fullName} <${email}> as ${dto.position} (${dto.role})`,
    });
    return { ok: true };
  }

  /**
   * Dual role is driven by the existence of a resident_profile row, not by
   * `role` (see AuthService: `isResident = role === RESIDENT || profile !== null`).
   * A staff account that was never census-linked has no profile, so demoting it
   * only *looked* like a resident — promoting back then dropped the resident
   * side entirely. Linking the census record here makes the pairing durable in
   * both directions.
   *
   * Returns true when the user ends up with a resident profile.
   */
  private async ensureResidentProfile(user: User): Promise<boolean> {
    const existing = await this.profiles.findOne({ where: { userId: user.id } });
    if (existing) return true;

    const censusMatch = await this.census
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.full_name)) = LOWER(:name)', { name: user.fullName.trim() })
      .andWhere('c.is_active = 1')
      .getOne();
    if (!censusMatch) return false;

    // Never steal a census record another account already claimed.
    const claimed = await this.profiles.findOne({ where: { censusRecordId: censusMatch.id } });
    if (claimed) return false;

    await this.profiles.save(
      this.profiles.create({
        userId: user.id,
        censusRecordId: censusMatch.id,
        verificationStatus: VerificationStatus.PENDING,
        address: censusMatch.address,
        purok: censusMatch.purok,
        birthdate: censusMatch.birthdate,
      }),
    );
    return true;
  }

  /**
   * Promote an existing RESIDENT account to staff (one email, one account —
   * the resident profile stays linked, granting dual role automatically).
   */
  @Post('promote')
  async promote(@Body() dto: CreateInviteDto, @CurrentUser() actor: RequestUser) {
    const email = dto.email.toLowerCase();
    const target = await this.users.findOne({ where: { email } });
    if (!target) throw new BadRequestException('No account found for this email — send an invite instead.');
    if (target.role !== Role.RESIDENT) {
      throw new BadRequestException('This account is already staff.');
    }

    // Do this BEFORE the role flips: once role !== RESIDENT, dual role depends
    // entirely on the profile row existing.
    const dualRole = await this.ensureResidentProfile(target);

    await this.users.update({ id: target.id }, { role: dto.role, position: dto.position });
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Promoted Resident to Staff',
      target: `${target.fullName} <${email}> → ${dto.position} (${dto.role})`,
    });
    await this.queue.publish(QUEUES.email, {
      to: email,
      subject: `Barangay 591 — You are now ${dto.role === Role.ADMIN ? 'an Administrator' : 'Barangay Staff'}`,
      html: `
        <p>Hi ${target.fullName},</p>
        <p>${actor.fullName} granted your account
        <strong>${dto.role === Role.ADMIN ? 'Administrator' : 'Barangay Staff'}</strong> access.
        Sign in as usual — you'll land in the staff portal, and you can switch back to your
        resident portal anytime from the sidebar.</p>`,
    });
    return { ok: true, fullName: target.fullName, dualRole };
  }

  /** Demote a staff account back to resident (requires a linked resident profile). */
  @Post('demote')
  async demote(@Body() dto: { email: string }, @CurrentUser() actor: RequestUser) {
    const email = (dto.email ?? '').toLowerCase();
    const target = await this.users.findOne({ where: { email } });
    if (!target || target.role === Role.RESIDENT) {
      throw new BadRequestException('No staff account found for this email.');
    }
    if (target.id === actor.id) throw new BadRequestException('You cannot demote your own account.');

    const linked = await this.ensureResidentProfile(target);
    await this.users.update({ id: target.id }, { role: Role.RESIDENT, position: null });
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Demoted Staff to Resident',
      target: `${target.fullName} <${email}>${linked ? '' : ' · no census record — resident portal limited'}`,
    });
    // linked=false means there is no census record under this name, so the
    // account cannot act as a real resident (no verification, no services).
    return { ok: true, linked };
  }

  @Delete('invites/:id')
  async revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    const invite = await this.invites.findOne({ where: { id } });
    if (!invite) throw new NotFoundException('Invite not found.');
    if (invite.acceptedAt) throw new BadRequestException('This invite was already accepted.');
    await this.invites.update({ id }, { revokedAt: new Date() });
    this.audit.log({
      actorLabel: `${user.fullName} (Admin)`,
      actorId: user.id,
      action: 'Revoked Staff Invite',
      target: `${invite.fullName} <${invite.email}>`,
    });
    return { ok: true };
  }
}
