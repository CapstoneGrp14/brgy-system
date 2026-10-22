import {
  BookingDto,
  BookingSlotDto,
  BookingStatus,
  FacilityDto,
  Role,
  VerificationStatus,
} from '@brgy/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestUser } from '../../common/decorators';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { HouseholdAuthorityService } from '../masterlist/household-authority.service';
import { ResidentProfile } from '../users/resident-profile.entity';
import { BookingSlot } from './booking-slot.entity';
import { Booking } from './booking.entity';
import { Facility } from './facility.entity';

const fmtDate = (d: string) =>
  new Date(d + 'T00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

@Injectable()
export class BookingsService {
  constructor(
    private readonly household: HouseholdAuthorityService,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(BookingSlot) private readonly slots: Repository<BookingSlot>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly queue: QueueService,
  ) {}

  private toDto(b: Booking, staff = false): BookingDto {
    return {
      id: b.id,
      facilityId: b.facilityId,
      facilityName: b.facility?.name ?? '',
      purpose: b.purpose,
      date: typeof b.date === 'string' ? b.date : new Date(b.date).toISOString().slice(0, 10),
      timeSlot: b.timeSlot,
      status: b.status,
      decidedBy: b.decidedBy,
      createdAt: b.createdAt.toISOString(),
      ...(staff ? { requestedBy: b.user?.fullName ?? 'Unknown' } : {}),
    };
  }

  async listFacilities(includeInactive = false): Promise<FacilityDto[]> {
    const rows = await this.facilities.find({ order: { createdAt: 'ASC' } });
    return rows
      .filter((f) => includeInactive || f.isActive)
      .map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        ...(includeInactive ? { isActive: f.isActive, blockedSlots: f.blockedSlots ?? [] } : {}),
      }));
  }

  async listSlots(includeInactive = false): Promise<BookingSlotDto[]> {
    const rows = await this.slots.find({ order: { sort: 'ASC' } });
    return rows
      .filter((s) => includeInactive || s.isActive)
      .map((s) => ({ id: s.id, label: s.label, isOffPeak: s.isOffPeak, isActive: s.isActive }));
  }

  /** What (if anything) occupies this facility/date/slot. */
  private async findConflict(
    facility: Facility,
    date: string,
    timeSlot: string,
    excludeBookingId?: string,
  ): Promise<string | null> {
    const blocked = facility.blockedSlots?.find((b) => b.slot === timeSlot);
    if (blocked) return blocked.title;

    const qb = this.bookings
      .createQueryBuilder('b')
      .where('b.facility_id = :fid AND b.date = :date AND b.time_slot = :slot', {
        fid: facility.id,
        date,
        slot: timeSlot,
      })
      .andWhere('b.status = :confirmed', { confirmed: BookingStatus.CONFIRMED });
    if (excludeBookingId) qb.andWhere('b.id != :ex', { ex: excludeBookingId });
    const clash = await qb.getOne();
    return clash ? (clash.purpose ?? 'a confirmed booking') : null;
  }

  /** Nearest free slot, preferring admin-flagged off-peak hours. */
  private async suggestSlot(facility: Facility, date: string): Promise<string | null> {
    const active = await this.listSlots();
    const ordered = [...active.filter((s) => s.isOffPeak), ...active.filter((s) => !s.isOffPeak)];
    for (const { label } of ordered) {
      if (!(await this.findConflict(facility, date, label))) return label;
    }
    return null;
  }

  async create(
    user: RequestUser,
    input: {
      facilityId: string;
      date: string;
      timeSlot: string;
      purpose?: string;
      fromSuggestion?: boolean;
      beneficiaryCensusRecordId?: string;
    },
  ): Promise<BookingDto> {
    const profile = await this.profiles.findOne({ where: { userId: user.id } });
    if (profile?.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Services are locked until verification — upload your supporting documents to get verified.',
      );
    }

    // A parent reserving the court for a child's event is the ordinary case.
    // Checked against the household registry, never taken from the request.
    const beneficiaryName = input.beneficiaryCensusRecordId
      ? await this.household.resolveBeneficiary(user.id, input.beneficiaryCensusRecordId)
      : null;

    const facility = await this.facilities.findOne({ where: { id: input.facilityId } });
    if (!facility || !facility.isActive) throw new NotFoundException('Facility not available.');
    const activeSlots = await this.listSlots();
    if (!activeSlots.some((s) => s.label === input.timeSlot)) {
      throw new BadRequestException('Pick one of the available time slots.');
    }
    if (input.date < new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Pick today or a future date.');
    }

    const conflictTitle = await this.findConflict(facility, input.date, input.timeSlot);
    if (conflictTitle) {
      const suggestedSlot = await this.suggestSlot(facility, input.date);
      throw new ConflictException({
        message: `"${conflictTitle}" is already confirmed for this time.`,
        conflictTitle,
        suggestedSlot,
      });
    }

    // All bookings — including resolver-suggested slots — wait for staff
    // confirmation (user decision: no auto-confirm bypassing staff oversight).
    const booking = await this.bookings.save(
      this.bookings.create({
        beneficiaryCensusRecordId: input.beneficiaryCensusRecordId ?? null,
        facilityId: facility.id,
        userId: user.id,
        purpose: beneficiaryName
          ? `For ${beneficiaryName}${input.purpose?.trim() ? ` — ${input.purpose.trim()}` : ''}`
          : input.purpose?.trim() || null,
        date: input.date,
        timeSlot: input.timeSlot,
        status: BookingStatus.PENDING,
      }),
    );
    booking.facility = facility;

    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: input.fromSuggestion ? 'Requested Booking (via smart suggestion)' : 'Requested Booking',
      target: `${facility.name} · ${fmtDate(input.date)} ${input.timeSlot}`,
    });
    await this.notifications.notifyStaff(
      `📅 Booking request: ${facility.name} — ${user.fullName} (${fmtDate(input.date)} ${input.timeSlot})${input.fromSuggestion ? ' · via smart suggestion' : ''}`,
      'booking',
    );
    return this.toDto(booking);
  }

  async mine(userId: string): Promise<BookingDto[]> {
    const rows = await this.bookings.find({
      where: { userId },
      relations: { facility: true },
      order: { date: 'ASC', timeSlot: 'ASC' },
      take: 20,
    });
    return rows.map((b) => this.toDto(b));
  }

  /** Staff review list: pending first (with live conflict + suggestion), then recent decided. */
  async staffList(): Promise<BookingDto[]> {
    const rows = await this.bookings.find({
      relations: { facility: true, user: true },
      order: { createdAt: 'DESC' },
      take: 30,
    });
    return Promise.all(
      rows.map(async (b) => {
        const dto = this.toDto(b, true);
        if (b.status === BookingStatus.PENDING) {
          const date = dto.date;
          dto.conflictTitle = await this.findConflict(b.facility, date, b.timeSlot, b.id);
          dto.suggestedSlot = dto.conflictTitle ? await this.suggestSlot(b.facility, date) : null;
        }
        return dto;
      }),
    );
  }

  // ── Admin configuration ────────────────────────────────────────────────

  async addFacility(input: { name: string; type: 'FACILITY' | 'EQUIPMENT' }, actor: RequestUser) {
    const exists = await this.facilities.findOne({ where: { name: input.name.trim() } });
    if (exists) throw new BadRequestException('A facility with this name already exists.');
    const facility = await this.facilities.save(
      this.facilities.create({ name: input.name.trim(), type: input.type, blockedSlots: [] }),
    );
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Added Bookable Facility',
      target: `${facility.name} (${facility.type})`,
    });
    return { ok: true, id: facility.id };
  }

  async toggleFacility(id: string, actor: RequestUser) {
    const facility = await this.facilities.findOne({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found.');
    await this.facilities.update({ id }, { isActive: !facility.isActive });
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: facility.isActive ? 'Disabled Bookable Facility' : 'Enabled Bookable Facility',
      target: facility.name,
    });
    return { ok: true };
  }

  async setBlock(
    id: string,
    input: { slot: string; title?: string; remove?: boolean },
    actor: RequestUser,
  ) {
    const facility = await this.facilities.findOne({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found.');
    const blocks = (facility.blockedSlots ?? []).filter((b) => b.slot !== input.slot);
    if (!input.remove) {
      if (!input.title?.trim()) throw new BadRequestException('Give the reserved slot a title.');
      blocks.push({ slot: input.slot, title: input.title.trim() });
    }
    await this.facilities.update({ id }, { blockedSlots: blocks });
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: input.remove ? 'Removed Recurring Reservation' : 'Added Recurring Reservation',
      target: `${facility.name} @ ${input.slot}${input.title ? ` (${input.title})` : ''}`,
    });
    return { ok: true };
  }

  async addSlot(input: { label: string; isOffPeak: boolean }, actor: RequestUser) {
    const label = input.label.trim();
    if (!/^\d{1,2}:\d{2} (AM|PM)$/.test(label)) {
      throw new BadRequestException('Use the format "H:MM AM/PM", e.g. 11:00 AM.');
    }
    const exists = await this.slots.findOne({ where: { label } });
    if (exists) throw new BadRequestException('This time slot already exists.');
    const maxSort = await this.slots.maximum('sort' as never);
    await this.slots.save(
      this.slots.create({ label, isOffPeak: input.isOffPeak, sort: (maxSort ?? 0) + 1 }),
    );
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: 'Added Booking Time Slot',
      target: `${label}${input.isOffPeak ? ' (off-peak)' : ''}`,
    });
    return { ok: true };
  }

  async toggleSlot(id: string, actor: RequestUser) {
    const slot = await this.slots.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found.');
    if (slot.isActive) {
      const active = await this.slots.count({ where: { isActive: true } });
      if (active <= 1) throw new BadRequestException('At least one time slot must stay active.');
    }
    await this.slots.update({ id }, { isActive: !slot.isActive });
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: slot.isActive ? 'Disabled Booking Time Slot' : 'Enabled Booking Time Slot',
      target: slot.label,
    });
    return { ok: true };
  }

  async decide(
    id: string,
    input: { approve: boolean; useSuggestion?: boolean },
    actor: RequestUser,
  ): Promise<BookingDto> {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: { facility: true, user: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.status !== BookingStatus.PENDING) throw new BadRequestException('Already decided.');

    const date = this.toDto(booking).date;
    if (input.approve) {
      let finalSlot = booking.timeSlot;
      const conflictTitle = await this.findConflict(booking.facility, date, booking.timeSlot, booking.id);
      if (conflictTitle) {
        const suggestion = await this.suggestSlot(booking.facility, date);
        if (!input.useSuggestion || !suggestion) {
          throw new ConflictException({
            message: `"${conflictTitle}" occupies this slot — accept the suggestion or reject.`,
            conflictTitle,
            suggestedSlot: suggestion,
          });
        }
        finalSlot = suggestion;
      }
      booking.timeSlot = finalSlot;
      booking.status = BookingStatus.CONFIRMED;
    } else {
      booking.status = BookingStatus.REJECTED;
    }
    booking.decidedBy = actor.fullName;
    await this.bookings.save(booking);

    const actorLabel = `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`;
    const when = `${fmtDate(date)} · ${booking.timeSlot}`;
    this.audit.log({
      actorLabel,
      actorId: actor.id,
      action: input.approve ? 'Confirmed Booking' : 'Rejected Booking',
      target: `${booking.facility.name} — ${booking.user.fullName} (${when})`,
    });

    if (input.approve) {
      await this.notifications.notify(
        booking.userId,
        `📅 Booking confirmed: ${booking.facility.name} on ${when}`,
        'booking',
      );
      await this.queue.publish(QUEUES.email, {
        to: booking.user.email,
        subject: `Barangay 591 — Booking confirmed: ${booking.facility.name}`,
        html: `
          <p>Hi ${booking.user.fullName},</p>
          <p>Your booking is <strong>confirmed</strong>:</p>
          <p><strong>${booking.facility.name}</strong><br/>${when}${booking.purpose ? `<br/>${booking.purpose}` : ''}</p>
          <p>Please arrive on time; bring one valid ID for equipment pickups.</p>`,
      });
    } else {
      await this.notifications.notify(
        booking.userId,
        `📅 Booking for ${booking.facility.name} (${when}) was rejected — try another slot.`,
        'booking',
      );
      await this.queue.publish(QUEUES.email, {
        to: booking.user.email,
        subject: `Barangay 591 — Booking not approved: ${booking.facility.name}`,
        html: `
          <p>Hi ${booking.user.fullName},</p>
          <h2 style="margin:8px 0">Your booking was not approved</h2>
          <p><strong>${booking.facility.name}</strong><br/>${when}${booking.purpose ? `<br/>${booking.purpose}` : ''}</p>
          <p>The slot may be taken or reserved for a barangay activity. Please pick another
             date or time under <strong>My Bookings</strong> — off-peak slots are usually easiest to get.</p>
          <p>Questions? Visit the Barangay Hall front desk (Mon–Sat, 8:00 AM–5:00 PM).</p>`,
      });
    }
    return this.toDto(booking, true);
  }
}
