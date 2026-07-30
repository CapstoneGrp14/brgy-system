import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { ServiceRequest } from '../requests/service-request.entity';
import { StorageService } from '../storage/storage.service';
import { DocumentTemplate } from '../templates/document-template.entity';
import { ResidentProfile } from '../users/resident-profile.entity';
import { User } from '../users/user.entity';
import { renderCertificate } from './certificate';
import { convertDocxToPdf, fillDocxTemplate } from './template-renderer';

/**
 * Worker: generates the certificate PDF for a completed document request.
 * Uses the barangay's uploaded .docx template when one is active for the
 * document type (filled + converted via Gotenberg); otherwise falls back to
 * the built-in pdfkit certificate.
 */
@Injectable()
export class PdfConsumer implements OnModuleInit {
  private readonly logger = new Logger(PdfConsumer.name);
  private readonly gotenbergUrl: string;

  constructor(
    private readonly queue: QueueService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    config: ConfigService,
    @InjectRepository(ServiceRequest) private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(ResidentProfile) private readonly profiles: Repository<ResidentProfile>,
    @InjectRepository(DocumentTemplate) private readonly templates: Repository<DocumentTemplate>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    this.gotenbergUrl = config.get('GOTENBERG_URL', 'http://localhost:3010');
  }

  async onModuleInit(): Promise<void> {
    await this.queue.consume(QUEUES.pdf, async (msg) => {
      const { requestId, mode = 'print-aid' } = msg as {
        requestId: string;
        mode?: 'print-aid' | 'pickup';
      };
      const request = await this.requests.findOne({ where: { id: requestId }, relations: { user: true } });
      if (!request) {
        this.logger.warn(`pdf job for unknown request ${requestId}`);
        return;
      }
      // Never clobber a staff-uploaded signed copy with a regenerated draft.
      if (request.payload?.signedUploaded === true && mode === 'print-aid') {
        this.logger.log(`Skipping draft for ${request.id} — signed copy already on file`);
        return;
      }

      // Generate only if no print copy exists yet (pickup jobs reuse the Review-time copy).
      if (!request.documentKey) {
        const profile = await this.profiles.findOne({ where: { userId: request.userId } });
        const pdf = await this.renderPdf(request, profile);
        const key = `${request.id}.pdf`;
        await this.storage.putObject(this.storage.documentsBucket, key, pdf, 'application/pdf');
        await this.requests.update({ id: request.id }, { documentKey: key });
      }

      if (mode === 'pickup') {
        // Sealed/signed at the hall — staff prints the PDF; resident gets a pickup notice, no link.
        await this.mail.send({
          to: request.user.email,
          subject: `Barangay 591 — Your ${request.title} is ready for pickup`,
          html: `
            <p>Hi ${request.user.fullName},</p>
            <p>Your <strong>${request.title}</strong> is ready for release at the Barangay Hall front desk.
            This document carries the barangay's official seal and signature, so it is claimed in person.</p>
            <p><strong>Please bring one (1) valid ID when claiming.</strong></p>
            <p>Office hours: Monday–Friday, 8:00 AM – 5:00 PM.</p>`,
        });
        this.audit.log({
          actorLabel: 'System Auto-Mailer',
          action: 'Prepared Document for Release',
          target: `${request.title} — ${request.user.fullName}`,
        });
        this.logger.log(`Prepared pickup PDF for ${request.title} (${request.id})`);
        return;
      }

      // print-aid: a DRAFT for staff to print, sign & seal — nothing is sent to
      // the resident. The issued email goes out only after staff uploads the
      // signed scan and completes the request.
      this.logger.log(`Generated signing draft for ${request.title} (${request.id})`);
    });
  }

  /** Name of the active staff member holding a position (for template signatories). */
  private async nameByPosition(positionPrefix: string): Promise<string> {
    const holder = await this.users
      .createQueryBuilder('u')
      .where('u.position LIKE :p AND u.is_active = 1', { p: `${positionPrefix}%` })
      .orderBy('u.created_at', 'ASC')
      .getOne();
    return holder?.fullName ?? '____________________';
  }

  private async renderPdf(request: ServiceRequest, profile: ResidentProfile | null): Promise<Buffer> {
    const template = await this.templates.findOne({
      where: { documentType: request.subtype, isActive: true },
    });
    const chairmanName = await this.nameByPosition('Punong Barangay');
    const secretaryName = await this.nameByPosition('Barangay Secretary');

    if (template) {
      try {
        const docxBytes = await this.storage.getObject(this.storage.uploadsBucket, template.storageKey);
        const filled = fillDocxTemplate(docxBytes, {
          resident_name: request.user.fullName,
          address: profile?.address ?? 'Barangay 591',
          purok: profile?.purok ?? '',
          purpose: request.purpose ?? 'general purposes',
          document_title: request.title,
          date_issued: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          document_id: request.id,
          chairman_name: chairmanName,
          secretary_name: secretaryName,
        });
        const pdf = await convertDocxToPdf(this.gotenbergUrl, filled);
        this.logger.log(`Rendered ${request.title} from template "${template.name}"`);
        return pdf;
      } catch (err) {
        this.logger.error(
          `Template "${template.name}" failed (${String(err)}) — falling back to built-in certificate`,
        );
      }
    }

    return renderCertificate({
      documentTitle: request.title,
      residentName: request.user.fullName,
      address: profile?.address ?? 'Barangay 591',
      purpose: request.purpose ?? 'general purposes',
      issuedAt: new Date(),
      requestId: request.id,
      chairmanName,
    });
  }
}
