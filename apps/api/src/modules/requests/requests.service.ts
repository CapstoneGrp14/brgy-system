import { randomUUID } from 'crypto';
import {
  DependantDto,
  QueueResponse,
  QueueTab,
  ReleaseMode,
  RequestDto,
  RequestStatus,
  RequestType,
  Role,
  STATUS_ACTIONS,
  SlaClass,
  VerificationStatus,
} from '@brgy/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RequestUser } from '../../common/decorators';
import { computeDueAt, slaSnapshot } from '../../common/sla';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { convertDocxToPdf } from '../pdf/template-renderer';
import { DocTypesService } from '../templates/doc-types.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { DocumentTypeSetting } from '../templates/document-type-setting.entity';
import { HouseholdAuthorityService } from '../masterlist/household-authority.service';
import { ResidentProfile } from '../users/resident-profile.entity';
import { Upload } from '../verification/upload.entity';
import { RequestEvent } from './request-event.entity';
import { CreateCctvRequestDto, CreateDocumentRequestDto } from './requests.dto';
import { ServiceRequest } from './service-request.entity';

const TAB_TYPES: Record<Exclude<QueueTab, 'all'>, RequestType[]> = {
  doc: [RequestType.DOCUMENT],
  health: [RequestType.MEDICINE, RequestType.EQUIPMENT],
  cctv: [RequestType.CCTV],
};

/** Statuses that still occupy the staff queue. */
const OPEN_STATUSES = [
  RequestStatus.PENDING,
  RequestStatus.PROCESSING,
  RequestStatus.READY,
  RequestStatus.OVERDUE,
  RequestStatus.ESCALATED,
];

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(ServiceRequest) private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(RequestEvent) private readonly events: Repository<RequestEvent>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    @InjectRepository(DocumentTypeSetting)
    private readonly typeSettings: Repository<DocumentTypeSetting>,
    @InjectRepository(Upload) private readonly uploads: Repository<Upload>,
    private readonly household: HouseholdAuthorityService,
    private readonly inventory: InventoryService,
    private readonly docTypes: DocTypesService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly queue: QueueService,
    private readonly storage: StorageService,
  ) {}

  /** Release-mode map for document subtypes (missing row = DIGITAL). */
  private async releaseModes(): Promise<Map<string, ReleaseMode>> {
    const rows = await this.typeSettings.find();
    return new Map(rows.map((s) => [s.documentType, s.releaseMode]));
  }

  private isPickup(r: ServiceRequest, modes: Map<string, ReleaseMode>): boolean {
    return r.type === RequestType.DOCUMENT && modes.get(r.subtype) === ReleaseMode.PICKUP;
  }

  /** Status transition for the current state, aware of type and release mode. */
  private resolveAction(
    r: ServiceRequest,
    modes: Map<string, ReleaseMode>,
  ): { actionText: string; next: RequestStatus } | null {
    if (r.type === RequestType.PRINTING) {
      const flow: Partial<Record<RequestStatus, { actionText: string; next: RequestStatus }>> = {
        [RequestStatus.PENDING]: { actionText: 'Mark Printed & Notify →', next: RequestStatus.READY },
        [RequestStatus.READY]: { actionText: 'Mark Claimed →', next: RequestStatus.CLAIMED },
        [RequestStatus.OVERDUE]: { actionText: 'Escalate →', next: RequestStatus.ESCALATED },
        [RequestStatus.ESCALATED]: { actionText: 'Mark Printed & Notify →', next: RequestStatus.READY },
      };
      return flow[r.status] ?? null;
    }
    if (r.type === RequestType.MEDICINE) {
      const flow: Partial<Record<RequestStatus, { actionText: string; next: RequestStatus }>> = {
        [RequestStatus.PENDING]: { actionText: 'Approve →', next: RequestStatus.READY },
        [RequestStatus.READY]: { actionText: 'Mark Claimed →', next: RequestStatus.CLAIMED },
        [RequestStatus.OVERDUE]: { actionText: 'Escalate →', next: RequestStatus.ESCALATED },
        [RequestStatus.ESCALATED]: { actionText: 'Approve →', next: RequestStatus.READY },
      };
      return flow[r.status] ?? null;
    }
    if (r.type === RequestType.EQUIPMENT) {
      // Lending lifecycle: released equipment is ON LEND until marked returned,
      // which puts the unit back into stock.
      const flow: Partial<Record<RequestStatus, { actionText: string; next: RequestStatus }>> = {
        [RequestStatus.PENDING]: { actionText: 'Approve →', next: RequestStatus.READY },
        [RequestStatus.READY]: { actionText: 'Mark Released →', next: RequestStatus.CLAIMED },
        [RequestStatus.CLAIMED]: { actionText: 'Mark Returned ✓', next: RequestStatus.CLOSED },
        [RequestStatus.OVERDUE]: { actionText: 'Escalate →', next: RequestStatus.ESCALATED },
        [RequestStatus.ESCALATED]: { actionText: 'Approve →', next: RequestStatus.READY },
      };
      return flow[r.status] ?? null;
    }
    if (this.isPickup(r, modes)) {
      const pickupFlow: Partial<Record<RequestStatus, { actionText: string; next: RequestStatus }>> = {
        [RequestStatus.PENDING]: { actionText: 'Review →', next: RequestStatus.PROCESSING },
        [RequestStatus.PROCESSING]: { actionText: 'Mark Ready for Pickup →', next: RequestStatus.READY },
        [RequestStatus.READY]: { actionText: 'Mark Released →', next: RequestStatus.CLAIMED },
        [RequestStatus.OVERDUE]: { actionText: 'Escalate →', next: RequestStatus.ESCALATED },
        [RequestStatus.ESCALATED]: { actionText: 'Mark Ready for Pickup →', next: RequestStatus.READY },
      };
      return pickupFlow[r.status] ?? null;
    }
    return STATUS_ACTIONS[r.status] ?? null;
  }

  private toDto(
    r: ServiceRequest,
    modes: Map<string, ReleaseMode>,
    includeResident = false,
  ): RequestDto {
    const snapshot = slaSnapshot(r.filedAt, r.dueAt, r.slaClass);
    return {
      id: r.id,
      type: r.type,
      subtype: r.subtype,
      title: r.title,
      purpose: r.purpose,
      slaClass: r.slaClass,
      status: r.status,
      filedAt: r.filedAt.toISOString(),
      dueAt: r.dueAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      ...snapshot,
      hasDocument: r.documentKey !== null,
      pickup: this.isPickup(r, modes),
      awaitingSignedUpload:
        r.type === RequestType.DOCUMENT &&
        !this.isPickup(r, modes) &&
        r.payload?.signedUploaded !== true,
      actionText: this.resolveAction(r, modes)?.actionText ?? null,
      ...(includeResident ? { residentName: r.user?.fullName ?? 'Unknown' } : {}),
    };
  }

  /** Resident downloads their issued PDF; unlocked after verification (FR-2.4). */
  async downloadUrl(requestId: string, user: RequestUser): Promise<{ url: string }> {
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request || request.userId !== user.id) throw new NotFoundException('Request not found.');
    if (!request.documentKey) throw new BadRequestException('No document has been issued for this request yet.');
    if (this.isPickup(request, await this.releaseModes())) {
      throw new BadRequestException(
        'This document is released at the Barangay Hall (it carries a seal and signature) — bring one valid ID to claim it.',
      );
    }

    const profile = await this.profiles.findOne({ where: { userId: user.id } });
    if (profile?.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Document downloads unlock after verification — upload your documents to get verified.',
      );
    }

    const url = await this.storage.presignedGet(this.storage.documentsBucket, request.documentKey, 3600);
    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: 'Downloaded Document PDF',
      target: request.title,
    });
    return { url };
  }


  async createDocumentRequest(user: RequestUser, dto: CreateDocumentRequestDto): Promise<RequestDto> {
    const meta = await this.docTypes.find(dto.documentType);
    if (!meta || !meta.isActive) throw new BadRequestException('Unknown document type.');

    // All service requests require a verified account (user decision, supersedes
    // the design's browse-while-pending behavior for filing).
    const profile = await this.profiles.findOne({ where: { userId: user.id } });
    if (profile?.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Services are locked until verification — upload your supporting documents to get verified.',
      );
    }

    // Filing for a minor is an authority claim, so it is checked against the
    // household registry rather than taken from the request body.
    const beneficiaryName = dto.beneficiaryCensusRecordId
      ? await this.household.resolveBeneficiary(user.id, dto.beneficiaryCensusRecordId)
      : null;

    const filedAt = new Date();
    const request = await this.requests.save(
      this.requests.create({
        userId: user.id,
        beneficiaryCensusRecordId: dto.beneficiaryCensusRecordId ?? null,
        type: RequestType.DOCUMENT,
        subtype: meta.key,
        title: beneficiaryName ? `${meta.labelText} — for ${beneficiaryName}` : meta.labelText,
        purpose: dto.purpose.trim(),
        slaClass: meta.sla,
        status: RequestStatus.PENDING,
        dueAt: computeDueAt(filedAt, meta.sla),
      }),
    );

    await this.events.insert({
      requestId: request.id,
      actorLabel: `${user.fullName} (Resident)`,
      fromStatus: null,
      toStatus: RequestStatus.PENDING,
      // Record who it was for: staff reviewing the queue need to see that the
      // certificate names a child, not the person who filed it.
      note: beneficiaryName
        ? `On behalf of ${beneficiaryName} — ${dto.purpose.trim()}`
        : dto.purpose.trim(),
    });
    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: 'Filed Document Request',
      target: meta.labelText,
    });
    await this.notifications.notifyStaff(`📄 New request: ${meta.labelText} — ${user.fullName}`, 'request');

    return this.toDto(request, await this.releaseModes());
  }

  private async requireVerified(user: RequestUser): Promise<void> {
    const profile = await this.profiles.findOne({ where: { userId: user.id } });
    if (profile?.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Services are locked until verification — upload your supporting documents to get verified.',
      );
    }
  }

  private async fileServiceRequest(
    user: RequestUser,
    data: {
      type: RequestType;
      subtype: string;
      title: string;
      purpose: string | null;
      payload?: Record<string, unknown>;
      beneficiaryCensusRecordId?: string | null;
    },
  ): Promise<ServiceRequest> {
    const filedAt = new Date();
    const request = await this.requests.save(
      this.requests.create({
        userId: user.id,
        beneficiaryCensusRecordId: data.beneficiaryCensusRecordId ?? null,
        type: data.type,
        subtype: data.subtype,
        title: data.title,
        purpose: data.purpose,
        slaClass: SlaClass.SIMPLE_3,
        status: RequestStatus.PENDING,
        dueAt: computeDueAt(filedAt, SlaClass.SIMPLE_3),
        payload: data.payload ?? null,
      }),
    );
    await this.events.insert({
      requestId: request.id,
      actorLabel: `${user.fullName} (Resident)`,
      fromStatus: null,
      toStatus: RequestStatus.PENDING,
      note: data.purpose,
    });
    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: `Filed ${data.title}`,
      target: null,
    });
    return request;
  }

  /** Free medicine request — subject to stock auto-close (FR-6.1/6.3). */
  async createMedicineRequest(
    user: RequestUser,
    dto: { itemId: string; quantity: string },
  ): Promise<RequestDto> {
    await this.requireVerified(user);
    const item = await this.inventory.getItem(dto.itemId);
    if (item.category !== 'MEDICINE') throw new BadRequestException('Pick a medicine item.');
    if (item.stockQty <= item.threshold) {
      throw new BadRequestException(`${item.name} is out of stock — requests are temporarily closed.`);
    }
    const request = await this.fileServiceRequest(user, {
      type: RequestType.MEDICINE,
      subtype: 'FREE_MEDICINE',
      title: `Free Medicine — ${item.name}`,
      purpose: dto.quantity,
      payload: { itemId: item.id, quantity: dto.quantity },
    });
    await this.notifications.notifyStaff(`💊 Medicine request: ${item.name} — ${user.fullName}`, 'request');
    return this.toDto(request, await this.releaseModes());
  }

  /** Medical equipment lending (FR-6.2). */
  async createEquipmentRequest(
    user: RequestUser,
    dto: { itemId: string; borrowDate: string },
  ): Promise<RequestDto> {
    await this.requireVerified(user);
    const item = await this.inventory.getItem(dto.itemId);
    if (item.category !== 'EQUIPMENT') throw new BadRequestException('Pick an equipment item.');
    if (item.stockQty <= item.threshold) {
      throw new BadRequestException(`${item.name} is fully lent out — requests are temporarily closed.`);
    }
    const request = await this.fileServiceRequest(user, {
      type: RequestType.EQUIPMENT,
      subtype: 'EQUIPMENT_LENDING',
      title: `${item.name} Lending`,
      purpose: `Borrow on ${dto.borrowDate}`,
      payload: { itemId: item.id, borrowDate: dto.borrowDate },
    });
    await this.notifications.notifyStaff(`🩺 Equipment lending: ${item.name} — ${user.fullName}`, 'request');
    return this.toDto(request, await this.releaseModes());
  }

  /** Student free printing / laminating (FR-7.1). */
  async createPrintingRequest(
    user: RequestUser,
    dto: { serviceType: string; copies: number; beneficiaryCensusRecordId?: string },
    file?: Express.Multer.File,
  ): Promise<RequestDto> {
    await this.requireVerified(user);
    // A parent printing schoolwork for their child is the ordinary case here.
    const beneficiaryName = dto.beneficiaryCensusRecordId
      ? await this.household.resolveBeneficiary(user.id, dto.beneficiaryCensusRecordId)
      : null;
    let uploadId: string | null = null;
    if (file) {
      const key = `printing/${user.id}/${randomUUID()}`;
      await this.storage.putObject(this.storage.uploadsBucket, key, file.buffer, file.mimetype);
      const upload = await this.uploads.save(
        this.uploads.create({
          bucket: this.storage.uploadsBucket,
          objectKey: key,
          mime: file.mimetype,
          size: file.size,
          originalName: file.originalname,
          uploaderId: user.id,
        }),
      );
      uploadId = upload.id;
    } else if (dto.serviceType !== 'Laminating') {
      throw new BadRequestException('Attach the file you want printed (PDF or Word).');
    }
    const request = await this.fileServiceRequest(user, {
      type: RequestType.PRINTING,
      subtype: 'STUDENT_PRINTING',
      title: beneficiaryName
        ? `${dto.serviceType} — ${dto.copies} ${dto.copies === 1 ? 'copy' : 'copies'} — for ${beneficiaryName}`
        : `${dto.serviceType} — ${dto.copies} ${dto.copies === 1 ? 'copy' : 'copies'}`,
      purpose: file ? file.originalname : 'Drop-off at Barangay Hall',
      payload: { serviceType: dto.serviceType, copies: dto.copies, uploadId },
      beneficiaryCensusRecordId: dto.beneficiaryCensusRecordId ?? null,
    });
    await this.notifications.notifyStaff(`🖨️ ${request.title} — ${user.fullName}`, 'request');
    return this.toDto(request, await this.releaseModes());
  }

  /** Health queue: full lifecycle incl. ON-LEND equipment awaiting return. */
  async healthQueue(): Promise<RequestDto[]> {
    const rows = await this.requests.find({
      where: { type: In([RequestType.MEDICINE, RequestType.EQUIPMENT]) },
      relations: { user: true },
      order: { filedAt: 'DESC' },
      take: 40,
    });
    const modes = await this.releaseModes();
    // Open + on-lend first, closed history after.
    const rank = (r: ServiceRequest) =>
      r.status === RequestStatus.CLOSED || r.status === RequestStatus.REJECTED ? 1 : 0;
    rows.sort((a, b) => rank(a) - rank(b));
    return rows.map((r) => this.toDto(r, modes, true));
  }

  /** Staff student-support queue with presigned file links. */
  async printingQueue(): Promise<Array<RequestDto & { fileUrl: string | null; fileName: string | null }>> {
    const rows = await this.requests.find({
      where: { type: RequestType.PRINTING },
      relations: { user: true },
      order: { filedAt: 'DESC' },
      take: 30,
    });
    const modes = await this.releaseModes();
    return Promise.all(
      rows.map(async (r) => {
        let fileUrl: string | null = null;
        let fileName: string | null = null;
        const uploadId = r.payload?.uploadId as string | undefined;
        if (uploadId) {
          const upload = await this.uploads.findOne({ where: { id: uploadId } });
          if (upload) {
            fileUrl = await this.storage.presignedGet(upload.bucket, upload.objectKey, 3600);
            fileName = upload.originalName;
          }
        }
        return { ...this.toDto(r, modes, true), fileUrl, fileName };
      }),
    );
  }

  /** Staff print view: streams the student's file; docx is converted to PDF
   *  via Gotenberg so it always renders (and prints) in the browser. */
  async printFile(id: string): Promise<{ buffer: Buffer; mime: string; filename: string }> {
    const request = await this.requests.findOne({ where: { id, type: RequestType.PRINTING } });
    if (!request) throw new NotFoundException('Printing request not found.');
    const uploadId = request.payload?.uploadId as string | undefined;
    if (!uploadId) throw new BadRequestException('This request has no uploaded file (front-desk drop-off).');
    const upload = await this.uploads.findOne({ where: { id: uploadId } });
    if (!upload) throw new NotFoundException('Uploaded file not found.');

    const bytes = await this.storage.getObject(upload.bucket, upload.objectKey);
    const isWord =
      upload.mime.includes('officedocument.wordprocessingml') ||
      upload.mime === 'application/msword' ||
      /\.docx?$/i.test(upload.originalName);
    if (!isWord) return { buffer: bytes, mime: upload.mime, filename: upload.originalName };

    const gotenbergUrl = process.env.GOTENBERG_URL ?? 'http://localhost:3010';
    const pdf = await convertDocxToPdf(gotenbergUrl, bytes);
    return {
      buffer: pdf,
      mime: 'application/pdf',
      filename: upload.originalName.replace(/\.docx?$/i, '') + '.pdf',
    };
  }

  /** CCTV footage request — technical class, 20-day SLA (FR-4.4). */
  async createCctvRequest(user: RequestUser, dto: CreateCctvRequestDto): Promise<RequestDto> {
    const profile = await this.profiles.findOne({ where: { userId: user.id } });
    if (profile?.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Services are locked until verification — upload your supporting documents to get verified.',
      );
    }

    const filedAt = new Date();
    const request = await this.requests.save(
      this.requests.create({
        userId: user.id,
        type: RequestType.CCTV,
        subtype: 'CCTV_FOOTAGE',
        title: 'CCTV Footage Request',
        purpose: `Incident at ${dto.location}${dto.incidentAt ? ` on ${dto.incidentAt}` : ''}`,
        slaClass: SlaClass.TECHNICAL_20,
        status: RequestStatus.PENDING,
        dueAt: computeDueAt(filedAt, SlaClass.TECHNICAL_20),
        payload: { location: dto.location, incidentAt: dto.incidentAt ?? null },
      }),
    );
    await this.events.insert({
      requestId: request.id,
      actorLabel: `${user.fullName} (Resident)`,
      fromStatus: null,
      toStatus: RequestStatus.PENDING,
      note: request.purpose,
    });
    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: 'Filed CCTV Footage Request',
      target: dto.location,
    });
    await this.notifications.notifyStaff(`📷 CCTV footage request — ${user.fullName} (${dto.location})`, 'request');
    return this.toDto(request, await this.releaseModes());
  }

  async myRequests(userId: string): Promise<RequestDto[]> {
    const [rows, modes] = await Promise.all([
      this.requests.find({ where: { userId }, order: { filedAt: 'DESC' }, take: 30 }),
      this.releaseModes(),
    ]);
    return rows.map((r) => this.toDto(r, modes));
  }

  async staffQueue(
    tab: QueueTab,
    page: number,
    pageSize: number,
    filters: { q?: string; deadline?: 'all' | 'overdue' | 'soon' | 'ontrack' } = {},
  ): Promise<QueueResponse> {
    const base = { status: In(OPEN_STATUSES) };
    const where = tab === 'all' ? base : { ...base, type: In(TAB_TYPES[tab]) };

    // Search and deadline filtering run in SQL, not on the returned page: the
    // queue shows five rows at a time, so filtering client-side would narrow
    // only what happens to be visible and under-report the real backlog.
    const qb = this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where({ ...where })
      .orderBy('r.dueAt', 'ASC');

    const term = filters.q?.trim();
    if (term) {
      qb.andWhere('(r.title LIKE :term OR u.fullName LIKE :term)', { term: `%${term}%` });
    }

    // "Due soon" mirrors the amber chip in the UI: not yet past the deadline,
    // but inside the next 24 hours.
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 3600 * 1000);
    if (filters.deadline === 'overdue') qb.andWhere('r.dueAt < :now', { now });
    else if (filters.deadline === 'soon') qb.andWhere('r.dueAt >= :now AND r.dueAt < :soon', { now, soon });
    else if (filters.deadline === 'ontrack') qb.andWhere('r.dueAt >= :soon', { soon });

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const countFor = async (t: Exclude<QueueTab, 'all'>) =>
      this.requests.count({ where: { ...base, type: In(TAB_TYPES[t]) } });
    const [allCount, doc, health, cctv, modes] = await Promise.all([
      this.requests.count({ where: base }),
      countFor('doc'),
      countFor('health'),
      countFor('cctv'),
      this.releaseModes(),
    ]);

    return {
      items: items.map((r) => this.toDto(r, modes, true)),
      total,
      page,
      pageSize,
      counts: { all: allCount, doc, health, cctv },
    };
  }

  /** Staff advances a request to its next status (server-computed, release-mode aware). */
  async advance(requestId: string, actor: RequestUser): Promise<RequestDto> {
    const request = await this.requests.findOne({ where: { id: requestId }, relations: { user: true } });
    if (!request) throw new NotFoundException('Request not found.');

    const modes = await this.releaseModes();
    const action = this.resolveAction(request, modes);
    if (!action) throw new BadRequestException(`No action available for status ${request.status}.`);
    const pickup = this.isPickup(request, modes);

    // Digital documents are emailed as the STAFF-UPLOADED signed & sealed scan —
    // never the raw template draft. Block completion until it's on file.
    if (
      request.type === RequestType.DOCUMENT &&
      !pickup &&
      action.next === RequestStatus.COMPLETED &&
      request.payload?.signedUploaded !== true
    ) {
      throw new BadRequestException(
        'Upload the signed & sealed copy first — open the request details and attach the scanned document.',
      );
    }

    const from = request.status;
    request.status = action.next;
    // For pickup documents the barangay's work is done at READY (ARTA stops there);
    // CLAIMED just records the physical release.
    if (
      action.next === RequestStatus.COMPLETED ||
      (action.next === RequestStatus.READY && pickup) ||
      (action.next === RequestStatus.CLAIMED && !request.completedAt)
    ) {
      request.completedAt = new Date();
    }
    await this.requests.save(request);

    const actorLabel = `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`;
    await this.events.insert({ requestId, actorLabel, fromStatus: from, toStatus: action.next, note: null });

    // Claiming medicine/equipment consumes stock (may trigger auto-close alerts).
    if (
      action.next === RequestStatus.CLAIMED &&
      (request.type === RequestType.MEDICINE || request.type === RequestType.EQUIPMENT) &&
      typeof request.payload?.itemId === 'string'
    ) {
      await this.inventory.dispense(request.payload.itemId, 1, actorLabel);
    }

    // Returned equipment goes back into stock (may re-open lending).
    if (
      action.next === RequestStatus.CLOSED &&
      request.type === RequestType.EQUIPMENT &&
      typeof request.payload?.itemId === 'string'
    ) {
      await this.inventory.returnStock(request.payload.itemId, 1, actorLabel);
    }

    // Health approvals email the resident so pickups aren't missed (FR-6).
    if (
      action.next === RequestStatus.READY &&
      (request.type === RequestType.MEDICINE || request.type === RequestType.EQUIPMENT)
    ) {
      const isMedicine = request.type === RequestType.MEDICINE;
      const borrowDate = typeof request.payload?.borrowDate === 'string' ? request.payload.borrowDate : null;
      await this.queue.publish(QUEUES.email, {
        to: request.user.email,
        subject: `Barangay 591 — ${request.title} approved, ready for pickup`,
        html: `
          <p>Hi ${request.user.fullName},</p>
          <p>Your <strong>${request.title}</strong> has been <strong>approved</strong>.</p>
          ${
            isMedicine
              ? `<p>Pick it up at the <strong>Barangay Health Center</strong> during office hours
                 (Monday–Friday, 8:00 AM – 5:00 PM).${request.purpose ? ` Quantity: ${request.purpose}.` : ''}</p>`
              : `<p>Pick it up at the <strong>Barangay Health Center</strong>${borrowDate ? ` on <strong>${new Date(borrowDate + 'T00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>` : ''}.
                 <strong>Bring one (1) valid ID</strong> — it will be held while the equipment is on loan.</p>`
          }
          <p>Unclaimed requests may be released back to stock after 3 working days.</p>`,
      });
      this.audit.log({
        actorLabel: 'System Auto-Mailer',
        action: 'Emailed Health Approval Notice',
        target: `${request.title} — ${request.user.fullName}`,
      });
    }

    // Student printing: "Mark Printed & Notify" emails the pickup notice (FR-7).
    if (action.next === RequestStatus.READY && request.type === RequestType.PRINTING) {
      await this.queue.publish(QUEUES.email, {
        to: request.user.email,
        subject: `Barangay 591 — 🖨️ ${request.title} is ready for pickup`,
        html: `
          <p>Hi ${request.user.fullName},</p>
          <h2 style="margin:8px 0">Your print job is ready 🖨️</h2>
          <p><strong>${request.title}</strong> has been printed and is ready for pickup at the
             <strong>Barangay Hall front desk</strong> (Monday–Saturday, 8:00 AM – 5:00 PM).</p>
          <p>Please bring your <strong>school ID or any valid ID</strong> when claiming. This service is free of charge.</p>`,
      });
      this.audit.log({
        actorLabel: 'System Auto-Mailer',
        action: 'Emailed Print Job Ready Notice',
        target: `${request.title} — ${request.user.fullName}`,
      });
    }
    this.audit.log({ actorLabel, actorId: actor.id, action: `Marked ${action.next.toLowerCase()}`, target: `${request.title} — ${request.user.fullName}` });

    const statusText: Partial<Record<RequestStatus, string>> = {
      [RequestStatus.PROCESSING]: 'is now Processing',
      [RequestStatus.COMPLETED]: 'is Completed',
      [RequestStatus.READY]:
        pickup && request.type === RequestType.DOCUMENT
          ? 'is Ready for Pickup at the Barangay Hall — bring one valid ID'
          : 'is Ready for Pickup',
      [RequestStatus.CLAIMED]:
        request.type === RequestType.EQUIPMENT
          ? 'was released — please return it on time. Salamat!'
          : pickup
            ? 'was released — thank you!'
            : 'was marked Claimed',
      [RequestStatus.CLOSED]:
        request.type === RequestType.EQUIPMENT ? 'return recorded — salamat po!' : 'was closed',
      [RequestStatus.ESCALATED]: 'was escalated',
    };
    await this.notifications.notify(
      request.userId,
      `📄 ${request.title} ${statusText[action.next] ?? `is now ${action.next}`}`,
      'request',
    );

    if (request.type === RequestType.DOCUMENT) {
      if (action.next === RequestStatus.PROCESSING) {
        // Generate the print copy at Review for BOTH modes, so the secretary can
        // print, sign & seal while the request is still Processing.
        await this.queue.publish(QUEUES.pdf, { requestId: request.id, mode: 'print-aid' });
      }
      if (action.next === RequestStatus.READY && pickup) {
        // Pickup: notify the resident (print copy already exists from Review).
        await this.queue.publish(QUEUES.pdf, { requestId: request.id, mode: 'pickup' });
      }
      if (action.next === RequestStatus.COMPLETED && !pickup && request.documentKey) {
        // Digital: email the resident a link to the staff-uploaded signed copy.
        const url = await this.storage.presignedGet(
          this.storage.documentsBucket,
          request.documentKey,
          7 * 24 * 3600,
        );
        await this.queue.publish(QUEUES.email, {
          to: request.user.email,
          subject: `Barangay 591 — Your ${request.title} is ready`,
          html: `
            <p>Hi ${request.user.fullName},</p>
            <p>Your <strong>${request.title}</strong> has been signed, sealed, and issued.
            Download your official copy from the e-Services portal (Document Requests),
            or use this direct link (valid for 7 days):</p>
            <p><a href="${url}">Download ${request.title} (signed copy)</a></p>
            <p>You may also claim a printed copy at the Barangay Hall front desk.</p>`,
        });
        this.audit.log({
          actorLabel: 'System Auto-Mailer',
          action: 'Issued Document PDF',
          target: `${request.title} — ${request.user.fullName}`,
        });
      }
    }

    return this.toDto(request, modes, true);
  }

  /** Staff uploads the signed & sealed scan that becomes the resident's official copy. */
  async uploadSignedDocument(
    requestId: string,
    file: Express.Multer.File,
    actor: RequestUser,
  ): Promise<RequestDto> {
    const request = await this.requests.findOne({ where: { id: requestId }, relations: { user: true } });
    if (!request) throw new NotFoundException('Request not found.');
    if (request.type !== RequestType.DOCUMENT) {
      throw new BadRequestException('Only document requests carry an issued document.');
    }

    const extByMime: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };
    const ext = extByMime[file.mimetype];
    if (!ext) throw new BadRequestException('Upload the signed copy as a PDF or a JPG/PNG scan.');

    const key = `${request.id}-signed.${ext}`;
    await this.storage.putObject(this.storage.documentsBucket, key, file.buffer, file.mimetype);
    await this.requests.update(
      { id: request.id },
      { documentKey: key, payload: { ...(request.payload ?? {}), signedUploaded: true } },
    );
    request.documentKey = key;
    request.payload = { ...(request.payload ?? {}), signedUploaded: true };

    this.audit.log({
      actorLabel: `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`,
      actorId: actor.id,
      action: 'Uploaded Signed Document',
      target: `${request.title} — ${request.user.fullName}`,
    });
    return this.toDto(request, await this.releaseModes(), true);
  }

  /** Staff downloads the generated PDF for printing (seal + signature). */
  /**
   * Stream the generated certificate through the API rather than handing back
   * a presigned link.
   *
   * The print window auto-fires the browser's print dialog, which means
   * calling print() on the embedded document — only possible when that
   * document is same-origin. A presigned object-store URL is a different
   * origin, so the dialog could never be triggered for it.
   */
  async printDocument(
    requestId: string,
    actor: RequestUser,
  ): Promise<{ buffer: Buffer; mime: string; filename: string }> {
    const request = await this.requests.findOne({ where: { id: requestId }, relations: { user: true } });
    if (!request) throw new NotFoundException('Request not found.');
    if (!request.documentKey) throw new BadRequestException('No document has been generated yet.');

    const bytes = await this.storage.getObject(this.storage.documentsBucket, request.documentKey);
    this.audit.log({
      actorLabel: `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`,
      actorId: actor.id,
      action: 'Opened Document for Printing',
      target: `${request.title} — ${request.user.fullName}`,
    });
    return {
      buffer: bytes,
      mime: 'application/pdf',
      filename: `${request.title.replace(/[^A-Za-z0-9 .-]/g, '')}.pdf`,
    };
  }

  async printUrl(requestId: string, actor: RequestUser): Promise<{ url: string }> {
    const request = await this.requests.findOne({ where: { id: requestId }, relations: { user: true } });
    if (!request) throw new NotFoundException('Request not found.');
    if (!request.documentKey) throw new BadRequestException('No document has been generated yet.');
    const url = await this.storage.presignedGet(this.storage.documentsBucket, request.documentKey, 3600);
    this.audit.log({
      actorLabel: `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`,
      actorId: actor.id,
      action: 'Downloaded Document for Printing',
      target: `${request.title} — ${request.user.fullName}`,
    });
    return { url };
  }

  /** Headline numbers for the employee dashboard stat cards. */
  async staffStats(): Promise<{ openTotal: number; dueSoon: number; overdue: number }> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
    const [openTotal, dueSoon, overdue] = await Promise.all([
      this.requests.count({ where: { status: In(OPEN_STATUSES) } }),
      this.requests
        .createQueryBuilder('r')
        .where('r.status IN (:...open)', { open: OPEN_STATUSES })
        .andWhere('r.due_at BETWEEN :now AND :in24h', { now, in24h })
        .getCount(),
      this.requests.count({ where: { status: RequestStatus.OVERDUE } }),
    ]);
    return { openTotal, dueSoon, overdue };
  }

  async exportCsv(): Promise<string> {
    const rows = await this.requests.find({ relations: { user: true }, order: { filedAt: 'DESC' } });
    const esc = (v: string | null) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const header = 'Request,Resident,Type,Filed,Due,Status,SLA Class';
    const lines = rows.map((r) =>
      [
        esc(r.title),
        esc(r.user?.fullName ?? ''),
        esc(r.type),
        esc(r.filedAt.toISOString().slice(0, 10)),
        esc(r.dueAt.toISOString().slice(0, 10)),
        esc(r.status),
        esc(r.slaClass),
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }
}
