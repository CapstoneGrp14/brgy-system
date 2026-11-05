import { isWithinBarangay } from '@brgy/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from './realtime.gateway';
import { SosAlert } from './sos-alert.entity';
import { SosThrottle } from './sos-throttle.entity';

/**
 * Escalating allowance before a cooldown, by tier. Index = tier.
 * Tier 0 permits five new alerts, then three, then one.
 */
const TIER_ALLOWANCE = [5, 3, 1];
/** Cooldown served for exhausting each tier, in minutes. */
const TIER_COOLDOWN_MINUTES = [5, 5, 30];
/** A quiet hour clears the record, so tiers never accumulate for life. */
const WINDOW_MINUTES = 60;

export interface SosAlertView {
  id: string;
  residentName: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
  resolvedBy: string | null;
}

@Injectable()
export class SosService {
  constructor(
    @InjectRepository(SosAlert) private readonly alerts: Repository<SosAlert>,
    @InjectRepository(SosThrottle) private readonly throttle: Repository<SosThrottle>,
    private readonly gateway: RealtimeGateway,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async toView(a: SosAlert): Promise<SosAlertView> {
    // Address comes from the linked census record when the resident is verified.
    const [row] = await this.alerts.manager.query(
      `SELECT u.full_name AS name, u.phone AS phone, c.address AS address, c.purok AS purok
       FROM users u
       LEFT JOIN resident_profiles rp ON rp.user_id = u.id
       LEFT JOIN census_records c ON c.id = rp.census_record_id
       WHERE u.id = ?`,
      [a.userId],
    );
    const address = row?.address ? `${row.address}${row.purok ? `, ${row.purok}` : ''}` : null;
    return {
      id: a.id,
      residentName: row?.name ?? 'Resident',
      phone: row?.phone ?? null,
      address,
      lat: a.lat === null ? null : Number(a.lat),
      lng: a.lng === null ? null : Number(a.lng),
      accuracy: a.accuracy,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      resolvedBy: a.resolvedBy,
    };
  }

  /** Fire (or refresh) the resident's SOS. One ACTIVE alert per user. */
  async trigger(
    user: { id: string; fullName: string },
    coords: { lat: number | null; lng: number | null; accuracy: number | null },
  ): Promise<SosAlertView> {
    // Jurisdiction check: barangay responders only cover Brgy 591 territory
    // (70 m GPS-drift buffer). No-GPS sends stay allowed — staff call instead.
    if (coords.lat !== null && coords.lng !== null && !isWithinBarangay(coords.lat, coords.lng)) {
      this.audit.log({
        actorLabel: user.fullName,
        actorId: user.id,
        action: 'SOS Denied — Outside Coverage',
        target: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      });
      throw new BadRequestException(
        'Your location is outside Barangay 591 territory, so our responders cannot reach you. Please call 911 or the barangay covering your current location.',
      );
    }
    let alert = await this.alerts.findOne({ where: { userId: user.id, status: 'ACTIVE' } });
    const isNew = !alert;
    // The cooldown governs *raising* an alert, never refreshing one that is
    // already live. Someone whose emergency is in progress keeps sending
    // position updates no matter what their history looks like.
    if (isNew) await this.assertNotCoolingDown(user);
    if (!alert) alert = this.alerts.create({ userId: user.id, status: 'ACTIVE' });
    alert.lat = coords.lat === null ? null : coords.lat.toFixed(7);
    alert.lng = coords.lng === null ? null : coords.lng.toFixed(7);
    alert.accuracy = coords.accuracy;
    alert = await this.alerts.save(alert);

    const view = await this.toView(alert);
    this.gateway.emitToStaff(isNew ? 'sos:new' : 'sos:update', view);
    if (isNew) {
      await this.notifications.notifyStaff(
        `🆘 ACTIVE SOS — ${user.fullName}${view.address ? ` (${view.address})` : ''} needs help`,
        'sos',
      );
      this.audit.log({
        actorLabel: user.fullName,
        actorId: user.id,
        action: 'Triggered Emergency SOS',
        target: view.lat !== null ? `${view.lat}, ${view.lng}` : 'no GPS fix',
      });
      await this.recordAlert(user);
    }
    return view;
  }

  /**
   * Refuse a *new* alert while the resident is cooling down.
   *
   * The message always carries 911 and the exact unlock time: a cooldown that
   * says only "you are blocked" to someone in trouble is worse than no
   * cooldown at all.
   */
  private async assertNotCoolingDown(user: { id: string; fullName: string }): Promise<void> {
    const row = await this.throttle.findOne({ where: { userId: user.id } });
    if (!row?.lockedUntil) return;
    const now = new Date();
    if (row.lockedUntil <= now) return;
    const minutes = Math.max(1, Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 60_000));
    const until = row.lockedUntil.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    throw new ForbiddenException({
      message:
        `The Emergency SOS button is paused on your account for ${minutes} more minute(s), until ${until}, ` +
        `because it was raised repeatedly in a short time. ` +
        `If this is a real emergency call 911 now, or go to the Barangay Hall — do not wait for the timer.`,
      lockedUntil: row.lockedUntil.toISOString(),
      minutesRemaining: minutes,
      reason: row.lockedReason ?? 'Repeated SOS alerts',
    });
  }

  /**
   * Count a newly raised alert, and start a cooldown if it exhausts the tier.
   *
   * Counting happens after the alert is saved, deliberately: the resident who
   * trips the limit still gets the help they just asked for, and only the
   * *next* attempt is refused.
   */
  private async recordAlert(user: { id: string; fullName: string }): Promise<void> {
    const now = new Date();
    const row =
      (await this.throttle.findOne({ where: { userId: user.id } })) ??
      this.throttle.create({ userId: user.id, alertsInWindow: 0, tier: 0, windowStartedAt: now });

    // An hour of quiet wipes the slate, so a resident with one bad night does
    // not carry a troll's penalty into next week.
    const stale =
      !row.windowStartedAt || now.getTime() - row.windowStartedAt.getTime() > WINDOW_MINUTES * 60_000;
    if (stale) {
      row.alertsInWindow = 0;
      row.tier = 0;
      row.windowStartedAt = now;
      row.lockedUntil = null;
      row.lockedReason = null;
    }

    row.alertsInWindow += 1;
    const tier = Math.min(row.tier, TIER_ALLOWANCE.length - 1);
    if (row.alertsInWindow >= TIER_ALLOWANCE[tier]) {
      const minutes = TIER_COOLDOWN_MINUTES[tier];
      row.lockedUntil = new Date(now.getTime() + minutes * 60_000);
      row.lockedReason = 'Trolling or spamming the Emergency SOS button';
      row.alertsInWindow = 0;
      row.tier = Math.min(row.tier + 1, TIER_ALLOWANCE.length - 1);
      row.windowStartedAt = now;
      this.audit.log({
        actorLabel: 'SOS Spam Guard',
        actorId: user.id,
        action: `SOS Paused ${minutes}m`,
        target: `${user.fullName} — ${row.lockedReason}`,
      });
      await this.notifications.notifyStaff(
        `⏸️ SOS paused ${minutes}m for ${user.fullName} — repeated alerts. Lift it from the SOS map if genuine.`,
        'sos',
      );
    }
    await this.throttle.save(row);
  }

  /** Current cooldown for a resident, or null when clear. */
  async cooldown(userId: string): Promise<{ lockedUntil: string; reason: string } | null> {
    const row = await this.throttle.findOne({ where: { userId } });
    if (!row?.lockedUntil || row.lockedUntil <= new Date()) return null;
    return {
      lockedUntil: row.lockedUntil.toISOString(),
      reason: row.lockedReason ?? 'Repeated SOS alerts',
    };
  }

  /**
   * Staff override. A pause is a guess about intent, and the people who can
   * see the resident and the map are better placed to judge than a counter.
   */
  async liftCooldown(userId: string, by: { label: string; actorId?: string }): Promise<void> {
    const row = await this.throttle.findOne({ where: { userId } });
    if (!row) throw new NotFoundException('That resident has no SOS pause.');
    row.lockedUntil = null;
    row.lockedReason = null;
    row.alertsInWindow = 0;
    row.tier = 0;
    row.liftedBy = by.label;
    await this.throttle.save(row);
    this.audit.log({
      actorLabel: by.label,
      actorId: by.actorId,
      action: 'Lifted SOS Pause',
      target: userId,
    });
  }

  async mine(userId: string): Promise<SosAlertView | null> {
    const alert = await this.alerts.findOne({ where: { userId, status: 'ACTIVE' } });
    return alert ? this.toView(alert) : null;
  }

  async active(): Promise<SosAlertView[]> {
    const list = await this.alerts.find({ where: { status: 'ACTIVE' }, order: { createdAt: 'ASC' } });
    return Promise.all(list.map((a) => this.toView(a)));
  }

  /**
   * Historical incident points (active + resolved) for the staff/admin SOS
   * hotspot heat layer. Recurring trouble areas surface as overlapping points.
   */
  async hotspot(): Promise<Array<{ lat: number; lng: number; status: 'ACTIVE' | 'RESOLVED'; createdAt: string }>> {
    const list = await this.alerts.find({ order: { createdAt: 'DESC' }, take: 500 });
    return list
      .filter((a) => a.lat !== null && a.lng !== null)
      .map((a) => ({
        lat: Number(a.lat),
        lng: Number(a.lng),
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      }));
  }

  /** Staff resolve or the resident's own cancel. */
  async resolve(id: string, by: { label: string; actorId?: string }, opts?: { onlyOwner?: string }): Promise<SosAlertView> {
    const alert = await this.alerts.findOne({ where: { id } });
    if (!alert || alert.status !== 'ACTIVE') throw new NotFoundException('No active alert found.');
    if (opts?.onlyOwner && alert.userId !== opts.onlyOwner) throw new NotFoundException('No active alert found.');

    alert.status = 'RESOLVED';
    alert.resolvedBy = by.label;
    alert.resolvedAt = new Date();
    await this.alerts.save(alert);

    const view = await this.toView(alert);
    this.gateway.emitToStaff('sos:resolved', view);
    this.gateway.emitToUser(alert.userId, 'sos:resolved', view);
    if (!opts?.onlyOwner) {
      await this.notifications.notify(
        alert.userId,
        `✅ Your SOS was attended by ${by.label} — alert marked resolved. Stay safe po!`,
        'sos',
      );
    }
    this.audit.log({
      actorLabel: by.label,
      actorId: by.actorId,
      action: opts?.onlyOwner ? 'Cancelled Own SOS' : 'Resolved Emergency SOS',
      target: `${view.residentName}${view.address ? ` — ${view.address}` : ''}`,
    });
    return view;
  }
}
