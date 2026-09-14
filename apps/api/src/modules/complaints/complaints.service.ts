import { randomUUID } from 'crypto';
import {
  ComplaintDto,
  ComplaintSource,
  ComplaintStatus,
  ComplaintsQueueResponse,
  Role,
} from '@brgy/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RequestUser } from '../../common/decorators';
import { businessDaysElapsed } from '../../common/sla';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { Upload } from '../verification/upload.entity';
import { Complaint } from './complaint.entity';

const MEDIATION_DAYS = 20;
const ACTIVE_STATUSES = [ComplaintStatus.FILED, ComplaintStatus.SUMMONS, ComplaintStatus.MEDIATION];

/** Staff action per status (Katarungang Pambarangay flow). */
export const COMPLAINT_ACTIONS: Partial<
  Record<ComplaintStatus, Array<{ actionText: string; next: ComplaintStatus }>>
> = {
  [ComplaintStatus.FILED]: [{ actionText: 'Issue Summons →', next: ComplaintStatus.SUMMONS }],
  [ComplaintStatus.SUMMONS]: [{ actionText: 'Start Mediation →', next: ComplaintStatus.MEDIATION }],
  [ComplaintStatus.MEDIATION]: [
    { actionText: 'Mark Resolved ✓', next: ComplaintStatus.RESOLVED },
    { actionText: 'Generate CFA →', next: ComplaintStatus.CFA_ISSUED },
  ],
};

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint) private readonly complaints: Repository<Complaint>,
    @InjectRepository(Upload) private readonly uploads: Repository<Upload>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async toDto(c: Complaint, forStaff: boolean): Promise<ComplaintDto> {
    const mediationDay = c.mediationDueAt
      ? Math.min(businessDaysElapsed(c.filedAt, new Date()), MEDIATION_DAYS)
      : null;
    const overdue =
      !!c.mediationDueAt && ACTIVE_STATUSES.includes(c.status) && c.mediationDueAt < new Date();
    return {
      id: c.id,
      caseTitle: c.caseTitle,
      category: c.category,
      description: c.description,
      respondentName: c.respondentName,
      isAnonymous: c.isAnonymous,
      source: c.source,
      status: c.status,
      luponAssignee: c.luponAssignee,
      mediationDay,
      mediationDays: MEDIATION_DAYS,
      overdue,
      filedAt: c.filedAt.toISOString(),
      complainantName: c.isAnonymous && !forStaff ? null : (c.complainant?.fullName ?? null),
      ...(forStaff ? { contactNumber: c.contactNumber } : {}),
      hasEvidence: c.evidenceUploadId !== null,
      evidenceUrl:
        forStaff && c.evidenceUpload
          ? await this.storage.presignedGet(c.evidenceUpload.bucket, c.evidenceUpload.objectKey, 3600)
          : null,
    };
  }

  async fileComplaint(
    user: RequestUser,
    input: {
      respondentName: string;
      description: string;
      category: string;
      contactNumber?: string;
      evidence?: Express.Multer.File;
    },
  ): Promise<ComplaintDto> {
    let evidenceUploadId: string | null = null;
    if (input.evidence) {
      const key = `evidence/${user.id}/${randomUUID()}`;
      await this.storage.putObject(
        this.storage.uploadsBucket,
        key,
        input.evidence.buffer,
        input.evidence.mimetype,
      );
      const upload = await this.uploads.save(
        this.uploads.create({
          bucket: this.storage.uploadsBucket,
          objectKey: key,
          mime: input.evidence.mimetype,
          size: input.evidence.size,
          originalName: input.evidence.originalname,
          uploaderId: user.id,
        }),
      );
      evidenceUploadId = upload.id;
    }

    const firstName = user.fullName.split(' ')[0];
    const initial = user.fullName.split(' ').at(-1)?.[0] ?? '';
    const complaint = await this.complaints.save(
      this.complaints.create({
        caseTitle: `${firstName} ${initial}. vs ${input.respondentName}`,
        category: input.category,
        description: input.description,
        respondentName: input.respondentName,
        complainantId: user.id,
        contactNumber: input.contactNumber ?? null,
        isAnonymous: false,
        evidenceUploadId,
        source: ComplaintSource.RESIDENT_FORM,
        mediationDueAt: new Date(Date.now() + MEDIATION_DAYS * 24 * 3600 * 1000),
      }),
    );

    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: 'Filed Complaint',
      target: complaint.caseTitle,
    });
    await this.notifications.notifyStaff(
      `⚖️ New complaint: ${complaint.caseTitle} (${complaint.category})`,
      'complaint',
    );
    return this.toDto(complaint, false);
  }

  async encodeBlotter(
    actor: RequestUser,
    input: { caseTitle: string; category: string; description: string; respondentName: string },
  ): Promise<ComplaintDto> {
    const complaint = await this.complaints.save(
      this.complaints.create({
        caseTitle: input.caseTitle,
        category: input.category,
        description: input.description,
        respondentName: input.respondentName,
        source: ComplaintSource.MANUAL_BLOTTER,
        // Blotter entries record incidents; no mediation clock unless escalated.
        mediationDueAt: null,
      }),
    );
    this.audit.log({
      actorLabel: `${actor.fullName} (Staff)`,
      actorId: actor.id,
      action: 'Encoded Blotter Entry',
      target: complaint.caseTitle,
    });
    return this.toDto(complaint, true);
  }

  async myComplaints(userId: string): Promise<ComplaintDto[]> {
    const rows = await this.complaints.find({
      where: { complainantId: userId },
      relations: { complainant: true },
      order: { filedAt: 'DESC' },
      take: 20,
    });
    return Promise.all(rows.map((c) => this.toDto(c, false)));
  }

  async staffQueue(includeClosed = false): Promise<ComplaintsQueueResponse> {
    const rows = await this.complaints.find({
      // Only live cases stay on the blotter. RESOLVED (settled) and CFA_ISSUED
      // (mediation failed, case moves to court) are terminal, so they drop off.
      // includeClosed=true brings them back for review.
      where: includeClosed ? {} : { status: In(ACTIVE_STATUSES) },
      relations: { complainant: true, evidenceUpload: true },
      order: { filedAt: 'DESC' },
      take: 50,
    });
    const activeCount = await this.complaints.count({ where: { status: In(ACTIVE_STATUSES) } });
    return { items: await Promise.all(rows.map((c) => this.toDto(c, true))), activeCount };
  }

  /**
   * Staff who can be assigned as Lupon mediator. Reads the real staff table so
   * newly invited/promoted accounts appear immediately — this was a hardcoded
   * list in the UI, which is why new staff never showed up.
   */
  async assignees(): Promise<Array<{ fullName: string; position: string | null }>> {
    const staff = await this.users.find({
      where: { role: In([Role.EMPLOYEE, Role.ADMIN]), isActive: true },
      select: ['fullName', 'position'],
      order: { fullName: 'ASC' },
    });
    return staff.map((u) => ({ fullName: u.fullName, position: u.position }));
  }

  async assignLupon(id: string, luponAssignee: string, actor: RequestUser): Promise<void> {
    const complaint = await this.complaints.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException('Case not found.');
    await this.complaints.update({ id }, { luponAssignee });
    this.audit.log({
      actorLabel: `${actor.fullName} (Staff)`,
      actorId: actor.id,
      action: 'Assigned Lupon Member',
      target: `${complaint.caseTitle} → ${luponAssignee}`,
    });
  }

  async advance(id: string, next: ComplaintStatus, actor: RequestUser): Promise<ComplaintDto> {
    const complaint = await this.complaints.findOne({
      where: { id },
      relations: { complainant: true, evidenceUpload: true },
    });
    if (!complaint) throw new NotFoundException('Case not found.');

    const allowed = COMPLAINT_ACTIONS[complaint.status]?.some((a) => a.next === next);
    if (!allowed) {
      throw new BadRequestException(`Cannot move a ${complaint.status} case to ${next}.`);
    }

    complaint.status = next;
    if (next === ComplaintStatus.RESOLVED || next === ComplaintStatus.CFA_ISSUED) {
      complaint.resolvedAt = new Date();
    }
    await this.complaints.save(complaint);

    const actionLabel: Partial<Record<ComplaintStatus, string>> = {
      [ComplaintStatus.SUMMONS]: 'Issued Summons',
      [ComplaintStatus.MEDIATION]: 'Started Mediation',
      [ComplaintStatus.RESOLVED]: 'Resolved Case',
      [ComplaintStatus.CFA_ISSUED]: 'Issued Certification to File Action',
    };
    this.audit.log({
      actorLabel: `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`,
      actorId: actor.id,
      action: actionLabel[next] ?? `Moved case to ${next}`,
      target: complaint.caseTitle,
    });

    if (complaint.complainantId) {
      const notifyText: Partial<Record<ComplaintStatus, string>> = {
        [ComplaintStatus.SUMMONS]: `⚖️ Summons issued for "${complaint.caseTitle}" — both parties will be notified of the hearing date.`,
        [ComplaintStatus.MEDIATION]: `⚖️ Mediation has started for "${complaint.caseTitle}".`,
        [ComplaintStatus.RESOLVED]: `✅ Your case "${complaint.caseTitle}" has been resolved. Salamat po!`,
        [ComplaintStatus.CFA_ISSUED]: `📄 A Certification to File Action was issued for "${complaint.caseTitle}" — you may now elevate the case to court. Claim the CFA at the Barangay Hall.`,
      };
      const text = notifyText[next];
      if (text) await this.notifications.notify(complaint.complainantId, text, 'complaint');
    }
    return this.toDto(complaint, true);
  }

  async activeCount(): Promise<number> {
    return this.complaints.count({ where: { status: In(ACTIVE_STATUSES) } });
  }
}
