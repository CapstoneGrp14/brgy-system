import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createWorker } from 'tesseract.js';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CensusRecord } from '../masterlist/census-record.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { ResidentProfile } from '../users/resident-profile.entity';
import { matchAgainstCensus } from './census-matcher';
import { VerificationSubmission } from './verification-submission.entity';

/** Worker: OCRs an uploaded ID and cross-checks it against the Barangay Census. */
@Injectable()
export class OcrConsumer implements OnModuleInit {
  private readonly logger = new Logger(OcrConsumer.name);

  constructor(
    private readonly queue: QueueService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @InjectRepository(VerificationSubmission)
    private readonly submissions: Repository<VerificationSubmission>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    @InjectRepository(CensusRecord) private readonly census: Repository<CensusRecord>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.consume(QUEUES.ocr, async (msg) => {
      const { submissionId } = msg as { submissionId: string };
      const submission = await this.submissions.findOne({
        where: { id: submissionId },
        relations: { user: true, upload: true },
      });
      if (!submission) {
        this.logger.warn(`ocr job for unknown submission ${submissionId}`);
        return;
      }

      try {
        if (submission.upload.mime === 'application/pdf') {
          // PDFs skip OCR in v1 — staff reviews the document manually.
          await this.submissions.update({ id: submission.id }, { ocrVerdict: 'MANUAL' });
          this.logger.log(`Submission ${submission.id} is a PDF — flagged for manual review`);
          return;
        }

        const image = await this.storage.getObject(submission.upload.bucket, submission.upload.objectKey);
        const worker = await createWorker('eng');
        const {
          data: { text },
        } = await worker.recognize(image);
        await worker.terminate();

        // Cross-check against the linked census record; fall back to the account name.
        const profile = await this.profiles.findOne({ where: { userId: submission.userId } });
        const censusRecord = profile?.censusRecordId
          ? await this.census.findOne({ where: { id: profile.censusRecordId } })
          : null;
        const referenceName = censusRecord?.fullName ?? submission.user.fullName;
        const referenceAddress = censusRecord?.address ?? profile?.address ?? null;

        const { score, verdict } = matchAgainstCensus(text, referenceName, referenceAddress);
        await this.submissions.update(
          { id: submission.id },
          { ocrText: text.slice(0, 60000), matchScore: score, ocrVerdict: verdict },
        );

        this.audit.log({
          actorLabel: 'OCR Census Cross-Check',
          action: `OCR ${verdict === 'MATCH' ? 'Matched' : verdict === 'PARTIAL' ? 'Partially Matched' : 'Found No Match'} (${score}%)`,
          target: `Resident: ${submission.user.fullName}`,
        });
        this.logger.log(`OCR done for ${submission.user.fullName}: ${verdict} (${score}%)`);
      } catch (err) {
        this.logger.error(`OCR failed for ${submissionId}: ${String(err)}`);
        await this.submissions.update({ id: submission.id }, { ocrVerdict: 'ERROR' });
      }
    });
  }
}
