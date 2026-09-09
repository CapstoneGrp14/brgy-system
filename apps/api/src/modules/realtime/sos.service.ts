import { isWithinBarangay } from '@brgy/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from './realtime.gateway';
import { SosAlert } from './sos-alert.entity';

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
    }
    return view;
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
