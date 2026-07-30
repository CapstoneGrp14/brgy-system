import { randomUUID } from 'crypto';
import {
  MyVerificationDto,
  Role,
  VerificationQueueResponse,
  VerificationStatus,
} from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { ResidentProfile } from '../users/resident-profile.entity';
import { Upload } from './upload.entity';
import { VerificationDocType } from './verification-doc-type.entity';
import { VerificationSubmission } from './verification-submission.entity';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

class SubmitDto {
  @IsUUID()
  docTypeId: string;
}

class DecideDto {
  @IsBoolean()
  approve: boolean;
}

class AddDocTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  labelText: string;
}

@Controller('verification')
export class VerificationController {
  constructor(
    @InjectRepository(VerificationSubmission)
    private readonly submissions: Repository<VerificationSubmission>,
    @InjectRepository(Upload) private readonly uploads: Repository<Upload>,
    @InjectRepository(VerificationDocType)
    private readonly docTypes: Repository<VerificationDocType>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /** Active supporting-document types (what residents can pick from). */
  @Get('doc-types')
  async listDocTypes() {
    const rows = await this.docTypes.find({ where: { isActive: true }, order: { createdAt: 'ASC' } });
    return rows.map((t) => ({ id: t.id, labelText: t.labelText }));
  }

  @Get('doc-types/all')
  @Roles(Role.ADMIN)
  async listAllDocTypes() {
    const rows = await this.docTypes.find({ order: { createdAt: 'ASC' } });
    return rows.map((t) => ({ id: t.id, labelText: t.labelText, isActive: t.isActive, createdBy: t.createdBy }));
  }

  @Post('doc-types')
  @Roles(Role.ADMIN)
  async addDocType(@Body() dto: AddDocTypeDto, @CurrentUser() user: RequestUser) {
    const row = await this.docTypes.save(
      this.docTypes.create({ labelText: dto.labelText.trim(), createdBy: user.fullName }),
    );
    this.audit.log({
      actorLabel: `${user.fullName} (Admin)`,
      actorId: user.id,
      action: 'Added Verification Doc Type',
      target: row.labelText,
    });
    return { id: row.id, ok: true };
  }

  @Post('doc-types/:id/toggle')
  @Roles(Role.ADMIN)
  async toggleDocType(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    const row = await this.docTypes.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Document type not found.');
    const active = await this.docTypes.count({ where: { isActive: true } });
    if (row.isActive && active <= 1) {
      throw new BadRequestException('At least one document type must stay active.');
    }
    await this.docTypes.update({ id }, { isActive: !row.isActive });
    this.audit.log({
      actorLabel: `${user.fullName} (Admin)`,
      actorId: user.id,
      action: row.isActive ? 'Disabled Verification Doc Type' : 'Enabled Verification Doc Type',
      target: row.labelText,
    });
    return { ok: true };
  }

  @Post('submit')
  @Roles(Role.RESIDENT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async submit(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: SubmitDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('Attach your document (JPG, PNG, WebP, or PDF).');
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WebP, or PDF files are accepted.');
    }
    const docType = await this.docTypes.findOne({ where: { id: dto.docTypeId, isActive: true } });
    if (!docType) throw new BadRequestException('Pick a valid document type.');

    const profile = await this.profiles.findOne({ where: { userId: user.id } });
    if (profile?.verificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Your account is already verified.');
    }
    const existing = await this.submissions.findOne({ where: { userId: user.id, status: 'PENDING' } });
    if (existing) {
      throw new BadRequestException('You already have a submission awaiting staff review.');
    }

    const key = `ids/${user.id}/${randomUUID()}`;
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

    const submission = await this.submissions.save(
      this.submissions.create({ userId: user.id, docType: docType.labelText, uploadId: upload.id }),
    );

    await this.queue.publish(QUEUES.ocr, { submissionId: submission.id });
    await this.notifications.notifyStaff(`👤 New verification submission — ${user.fullName}`, 'verification');
    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: 'Submitted Verification Document',
      target: docType.labelText,
    });
    return this.toMine(submission);
  }

  private toMine(s: VerificationSubmission): MyVerificationDto {
    return {
      id: s.id,
      docType: s.docType,
      ocrVerdict: s.ocrVerdict,
      matchScore: s.matchScore,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      decidedAt: s.decidedAt?.toISOString() ?? null,
    };
  }

  @Get('mine')
  @Roles(Role.RESIDENT)
  async mine(@CurrentUser() user: RequestUser): Promise<MyVerificationDto | null> {
    const latest = await this.submissions.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    return latest ? this.toMine(latest) : null;
  }

  @Get('queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  async staffQueue(): Promise<VerificationQueueResponse> {
    const rows = await this.submissions.find({
      relations: { user: true, upload: true },
      order: { createdAt: 'DESC' },
      take: 30,
    });
    const items = await Promise.all(
      rows.map(async (s) => ({
        id: s.id,
        residentName: s.user.fullName,
        docType: s.docType,
        fileName: s.upload.originalName,
        fileUrl: await this.storage.presignedGet(s.upload.bucket, s.upload.objectKey, 3600),
        ocrVerdict: s.ocrVerdict,
        matchScore: s.matchScore,
        status: s.status,
        decidedBy: s.decidedBy,
        createdAt: s.createdAt.toISOString(),
      })),
    );
    const pendingCount = await this.submissions.count({ where: { status: 'PENDING' } });
    return { items, pendingCount };
  }

  @Post(':id/decide')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  async decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideDto,
    @CurrentUser() actor: RequestUser,
  ) {
    const submission = await this.submissions.findOne({ where: { id }, relations: { user: true } });
    if (!submission) throw new NotFoundException('Submission not found.');
    if (submission.status !== 'PENDING') throw new BadRequestException('Already decided.');

    submission.status = dto.approve ? 'APPROVED' : 'REJECTED';
    submission.decidedBy = actor.fullName;
    submission.decidedAt = new Date();
    await this.submissions.save(submission);

    const webUrl = this.config.get('WEB_URL', 'http://localhost:5173');
    if (dto.approve) {
      await this.profiles.update(
        { userId: submission.userId },
        { verificationStatus: VerificationStatus.VERIFIED },
      );
      await this.notifications.notify(
        submission.userId,
        '🎉 Your account is now VERIFIED — all services are unlocked.',
        'verification',
      );
      await this.queue.publish(QUEUES.email, {
        to: submission.user.email,
        subject: 'Barangay 591 — ✅ Your account is verified!',
        html: `
          <p>Hi ${submission.user.fullName},</p>
          <h2 style="margin:8px 0">Your account is now verified 🎉</h2>
          <p>Your identity document was reviewed and approved by barangay staff.
             All portal services are now unlocked — you can request documents, file complaints,
             book facilities, ask for medicine assistance, and more.</p>
          <p><a href="${webUrl}/resident/dashboard">Open your dashboard</a></p>
        `,
      });
    } else {
      // Rejection leaves the profile PENDING — the resident can resubmit.
      await this.notifications.notify(
        submission.userId,
        '❌ Your verification was rejected — please upload a clearer or different document.',
        'verification',
      );
      await this.queue.publish(QUEUES.email, {
        to: submission.user.email,
        subject: 'Barangay 591 — Verification not approved, please resubmit',
        html: `
          <p>Hi ${submission.user.fullName},</p>
          <h2 style="margin:8px 0">We couldn't verify your document</h2>
          <p>The document you submitted (<strong>${submission.docType}</strong>) was <strong>not approved</strong>
             by barangay staff. Common reasons: the photo is blurry, details are cropped, or the
             name doesn't match the census record.</p>
          <p>Please upload a clearer photo or a different accepted ID to try again:</p>
          <p><a href="${webUrl}/resident/upload">Upload a new document</a></p>
          <p>Need help? Visit the Barangay Hall front desk (Mon–Sat, 8:00 AM–5:00 PM).</p>
        `,
      });
    }

    this.audit.log({
      actorLabel: `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`,
      actorId: actor.id,
      action: dto.approve ? 'Verified Account via OCR' : 'Rejected Verification',
      target: `Resident: ${submission.user.fullName}`,
    });
    return { ok: true };
  }
}
