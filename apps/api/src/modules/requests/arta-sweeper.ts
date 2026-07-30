import { ComplaintStatus, RequestStatus } from '@brgy/shared';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Complaint } from '../complaints/complaint.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestEvent } from './request-event.entity';
import { ServiceRequest } from './service-request.entity';

/** Worker cron: flags SLA-lapsed requests as OVERDUE (FR-3.6). */
@Injectable()
export class ArtaSweeper {
  private readonly logger = new Logger(ArtaSweeper.name);

  constructor(
    @InjectRepository(ServiceRequest) private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(RequestEvent) private readonly events: Repository<RequestEvent>,
    @InjectRepository(Complaint) private readonly complaints: Repository<Complaint>,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweep(): Promise<void> {
    // READY is excluded: the barangay's work is done — the resident just hasn't
    // picked it up / claimed it yet, which doesn't breach ARTA.
    const lapsed = await this.requests.find({
      where: {
        dueAt: LessThan(new Date()),
        status: In([RequestStatus.PENDING, RequestStatus.PROCESSING]),
      },
      relations: { user: true },
    });
    if (lapsed.length === 0) return;

    for (const request of lapsed) {
      const from = request.status;
      await this.requests.update({ id: request.id }, { status: RequestStatus.OVERDUE });
      await this.events.insert({
        requestId: request.id,
        actorLabel: 'ARTA SLA Tracker',
        fromStatus: from,
        toStatus: RequestStatus.OVERDUE,
        note: 'SLA deadline lapsed',
      });
      this.audit.log({
        actorLabel: 'ARTA SLA Tracker',
        action: 'Flagged Overdue',
        target: `${request.title} — ${request.user.fullName}`,
      });
      await this.notifications.notifyStaff(
        `⚠ ${request.title} (${request.user.fullName}) is OVERDUE`,
        'request',
      );
    }
    this.logger.warn(`Flagged ${lapsed.length} request(s) as OVERDUE`);
  }

  /** 20-day Katarungang Pambarangay mediation clock (FR-4.3). */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepComplaints(): Promise<void> {
    const lapsed = await this.complaints.find({
      where: {
        mediationDueAt: LessThan(new Date()),
        overdueFlagged: false,
        status: In([ComplaintStatus.FILED, ComplaintStatus.SUMMONS, ComplaintStatus.MEDIATION]),
      },
    });
    for (const complaint of lapsed) {
      await this.complaints.update({ id: complaint.id }, { overdueFlagged: true });
      this.audit.log({
        actorLabel: 'KP Mediation Tracker',
        action: 'Flagged Mediation Overdue',
        target: complaint.caseTitle,
      });
      await this.notifications.notifyStaff(
        `⚖️ Mediation deadline lapsed: ${complaint.caseTitle} — consider issuing a CFA`,
        'complaint',
      );
    }
    if (lapsed.length) this.logger.warn(`Flagged ${lapsed.length} complaint(s) mediation-overdue`);
  }
}
