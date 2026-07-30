import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailJob {
  to: string;
  subject: string;
  html: string;
}

/**
 * SMTP transport — env-driven, one knob for production:
 * set RESEND_API_KEY and mail goes out via Resend (smtp.resend.com:465);
 * leave it empty and the generic SMTP_* vars apply (MailHog in dev).
 * Only the worker actually sends; the API enqueues MailJobs on the `email` queue.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const resendKey = config.get<string>('RESEND_API_KEY', '');
    if (resendKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: { user: 'resend', pass: resendKey },
      });
      this.logger.log('Mail transport: Resend (smtp.resend.com:465)');
    } else {
      const user = config.get<string>('SMTP_USER', '');
      this.transporter = nodemailer.createTransport({
        host: config.get<string>('SMTP_HOST', 'localhost'),
        port: Number(config.get('SMTP_PORT', 1025)),
        secure: config.get('SMTP_SECURE', 'false') === 'true',
        auth: user ? { user, pass: config.get<string>('SMTP_PASS', '') } : undefined,
      });
      this.logger.log(`Mail transport: SMTP ${config.get('SMTP_HOST', 'localhost')}:${config.get('SMTP_PORT', 1025)}`);
    }
    this.from = config.get<string>('MAIL_FROM', 'Barangay 591 <no-reply@brgy591.local>');
  }

  /**
   * Wraps any job body in the portal-branded shell (navy #1E3A5F / gold
   * #F4A62A, same palette as the web app). Table-based + inline styles so it
   * renders in Gmail/Outlook; callers keep composing plain content HTML.
   */
  private brand(bodyHtml: string): string {
    return `<!doctype html>
<html>
  <head>
    <style>
      h1, h2, h3 { color: #1E3A5F; font-family: 'Segoe UI', Arial, sans-serif; }
      a { color: #2E66D0; }
      strong { color: #1E3A5F; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F0F4FA;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FA;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- header -->
          <tr>
            <td style="background:#1E3A5F;border-radius:12px 12px 0 0;padding:22px 30px;border-bottom:4px solid #F4A62A;">
              <span style="font:800 26px 'Segoe UI',Arial,sans-serif;color:#F4A62A;letter-spacing:1px;">591</span>
              <span style="font:600 11px 'Segoe UI',Arial,sans-serif;color:#ffffff;letter-spacing:2px;padding-left:10px;">BARANGAY 591 e-SERVICES PORTAL</span>
            </td>
          </tr>
          <!-- body -->
          <tr>
            <td style="background:#ffffff;padding:28px 30px;font:400 14px/1.65 'Segoe UI',Arial,sans-serif;color:#2E3A52;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="background:#F7F9FC;border-radius:0 0 12px 12px;padding:16px 30px;border-top:1px solid #E9EDF4;">
              <p style="margin:0;font:400 11.5px 'Segoe UI',Arial,sans-serif;color:#8A97AB;">
                Barangay 591 · Zone 58, District VI, Sta. Mesa, Manila · Mon–Sat, 8:00 AM–5:00 PM<br/>
                This is an automated message from the Barangay 591 e-Services Portal — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  async send(job: MailJob): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to: job.to, subject: job.subject, html: this.brand(job.html) });
    this.logger.log(`Sent "${job.subject}" to ${job.to}`);
  }
}
