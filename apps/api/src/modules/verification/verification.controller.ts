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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { RequiresModule } from '../../common/module-access';
import { checkSignature } from '../../common/file-signature';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { ResidentProfile } from '../users/resident-profile.entity';
import { Upload } from './upload.entity';
import { VerificationDocType } from './verification-doc-type.entity';
import { VerificationSubmission } from './verification-submission.entity';

class SubmitDto {
  @IsUUID()
  docTypeId: string;

  /**
   * Multipart carries everything as text, so the checkbox arrives as the
   * string "true" rather than a boolean — hence the string union instead of
   * @IsBoolean, which would reject it.
   */
  @IsOptional()
  @IsIn(['true', 'false'])
  surnameChangedByMarriage?: string;
}

/** The decision note is staff-authored free text that lands in an HTML email,
 *  so escape it rather than trusting the author not to type a bracket. */
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  );
}

/** Minimum note length. A rejection has to actually explain itself — the text is
 *  emailed to the resident as the reason to fix — so it is held to a longer bar
 *  than an approval comment. Enforced per-outcome in the handler. */
const APPROVE_NOTE_MIN = 3;
const REJECT_NOTE_MIN = 10;

class DecideDto {
  @IsBoolean()
  approve: boolean;

  // All three carry the same guidance: class-validator returns every failed
  // message and clients commonly surface only the first, so a missing note must
  // not surface as "note must be shorter than or equal to 500 characters".
  @IsString({ message: 'Add a short comment explaining this decision.' })
  @MinLength(APPROVE_NOTE_MIN, { message: 'Add a short comment explaining this decision.' })
  @MaxLength(500, { message: 'Keep the comment under 500 characters.' })
  note: string;
}

class AddDocTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  labelText: string;
}

@Controller('verification')
@RequiresModule('verification')
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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'supportingFile', maxCount: 1 },
      ],
      { limits: { fileSize: 8 * 1024 * 1024 } },
    ),
  )
  async submit(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; supportingFile?: Express.Multer.File[] } | undefined,
    @Body() dto: SubmitDto,
    @CurrentUser() user: RequestUser,
  ) {
    const file = files?.file?.[0];
    const supportingFile = files?.supportingFile?.[0];
    const surnameChanged = dto.surnameChangedByMarriage === 'true';
    if (!file) throw new BadRequestException('Attach a photo of your document (JPG, PNG, or WebP).');
    // Photos only. A PDF cannot be OCR'd by the cross-check, so it used to
    // land in a manual-review queue and the resident waited on a person to
    // open it — slower for them and more work for staff. A phone photo of the
    // ID goes through the same automated field check as everything else.
    //
    // Verified by content, not by the client-declared header: these files are
    // opened by staff during review, so a renamed executable must not reach them.
    const sig = checkSignature(file.buffer, ['jpeg', 'png', 'webp'], file.mimetype);
    if (!sig.ok) throw new BadRequestException(sig.reason);
    // The declaration is what licenses a surname mismatch in the cross-check,
    // so it does not stand on the resident's word alone — the certificate has
    // to be there, and it is checked by content like the primary document.
    if (surnameChanged) {
      if (!supportingFile) {
        throw new BadRequestException(
          'Attach a photo of your marriage certificate to evidence the surname change.',
        );
      }
      const supportingSig = checkSignature(
        supportingFile.buffer,
        ['jpeg', 'png', 'webp'],
        supportingFile.mimetype,
      );
      if (!supportingSig.ok) throw new BadRequestException(supportingSig.reason);
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

    // Stored only when declared: an orphan certificate with no declaration
    // behind it would sit in the bucket evidencing nothing.
    let supportingUploadId: string | null = null;
    if (surnameChanged && supportingFile) {
      const supportingKey = `ids/${user.id}/${randomUUID()}`;
      await this.storage.putObject(
        this.storage.uploadsBucket,
        supportingKey,
        supportingFile.buffer,
        supportingFile.mimetype,
      );
      const supportingUpload = await this.uploads.save(
        this.uploads.create({
          bucket: this.storage.uploadsBucket,
          objectKey: supportingKey,
          mime: supportingFile.mimetype,
          size: supportingFile.size,
          originalName: supportingFile.originalname,
          uploaderId: user.id,
        }),
      );
      supportingUploadId = supportingUpload.id;
    }

    const submission = await this.submissions.save(
      this.submissions.create({
        userId: user.id,
        docType: docType.labelText,
        uploadId: upload.id,
        surnameChangedByMarriage: surnameChanged,
        supportingUploadId,
      }),
    );

    await this.queue.publish(QUEUES.ocr, { submissionId: submission.id });
    await this.notifications.notifyStaff(`👤 New verification submission — ${user.fullName}`, 'verification');
    this.audit.log({
      actorLabel: `${user.fullName} (Resident)`,
      actorId: user.id,
      action: 'Submitted Verification Document',
      target: surnameChanged
        ? `${docType.labelText} + Marriage Certificate (surname change declared)`
        : docType.labelText,
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
      decisionNote: s.decisionNote,
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
      relations: { user: true, upload: true, supportingUpload: true },
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
        surnameChangedByMarriage: s.surnameChangedByMarriage,
        supportingFileName: s.supportingUpload?.originalName ?? null,
        supportingFileUrl: s.supportingUpload
          ? await this.storage.presignedGet(s.supportingUpload.bucket, s.supportingUpload.objectKey, 3600)
          : null,
        ocrVerdict: s.ocrVerdict,
        matchScore: s.matchScore,
        // Null for PDFs (never OCR'd) and for rows predating per-field scoring,
        // so the UI falls back to showing the score alone.
        ocrBreakdown: s.ocrFields
          ? {
              fields: s.ocrFields,
              score: s.matchScore ?? 0,
              missingRequired: s.ocrFields.filter((f) => f.required && !f.detected).map((f) => f.key),
            }
          : null,
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

    const note = dto.note.trim();
    if (!dto.approve && note.length < REJECT_NOTE_MIN) {
      throw new BadRequestException(
        'Explain why this document was rejected — the resident is shown this reason so they know what to fix.',
      );
    }

    submission.status = dto.approve ? 'APPROVED' : 'REJECTED';
    submission.decidedBy = actor.fullName;
    submission.decidedAt = new Date();
    submission.decisionNote = note;
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
        `❌ Your verification was rejected — ${note}`,
        'verification',
      );
      await this.queue.publish(QUEUES.email, {
        to: submission.user.email,
        subject: 'Barangay 591 — Verification not approved, please resubmit',
        html: `
          <p>Hi ${submission.user.fullName},</p>
          <h2 style="margin:8px 0">We couldn't verify your document</h2>
          <p>The document you submitted (<strong>${submission.docType}</strong>) was <strong>not approved</strong>
             by barangay staff.</p>
          <p style="background:#F0F4FA;border-left:3px solid #1E3A5F;border-radius:4px;padding:12px 16px;margin:16px 0">
             <strong>Reason given:</strong><br />${escapeHtml(note)}</p>
          <p>Please upload a clearer photo or a different accepted ID to try again:</p>
          <p><a href="${webUrl}/resident/upload">Upload a new document</a></p>
          <p>Need help? Visit the Barangay Hall front desk (Mon–Sat, 8:00 AM–5:00 PM).</p>
        `,
      });
    }

    // OCR verdict and score alongside the reason: an audit reader sees both what
    // the cross-check reported and why staff decided as they did. audit_logs.target
    // is varchar(255) and the note alone may be 500, so spend what is left on it.
    const context =
      `Resident: ${submission.user.fullName} · ${submission.docType} · ` +
      `OCR ${submission.ocrVerdict}${submission.matchScore === null ? '' : ` (${submission.matchScore}%)`} · Reason: `;
    const room = 255 - context.length;
    this.audit.log({
      actorLabel: `${actor.fullName} (${actor.role === Role.ADMIN ? 'Admin' : 'Staff'})`,
      actorId: actor.id,
      action: dto.approve ? 'Verified Account via OCR' : 'Rejected Verification',
      target: (context + (note.length > room ? `${note.slice(0, Math.max(0, room - 1))}…` : note)).slice(0, 255),
    });
    return { ok: true };
  }
}
