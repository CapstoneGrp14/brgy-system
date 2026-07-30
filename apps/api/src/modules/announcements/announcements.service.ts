import { Role } from '@brgy/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUES, QueueService } from '../queue/queue.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { Announcement } from './announcement.entity';

export interface AnnouncementView {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  channelBanner: boolean;
  channelEmail: boolean;
  photoUrl: string | null;
  authorLabel: string;
  createdAt: string;
}

const UPLOADS_BUCKET = 'uploads';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly queue: QueueService,
    private readonly notifications: NotificationsService,
    private readonly gateway: RealtimeGateway,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  private async toView(a: Announcement): Promise<AnnouncementView> {
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      urgent: a.urgent,
      channelBanner: a.channelBanner,
      channelEmail: a.channelEmail,
      photoUrl: a.photoKey ? await this.storage.presignedGet(UPLOADS_BUCKET, a.photoKey) : null,
      authorLabel: a.authorLabel,
      createdAt: a.createdAt.toISOString(),
    };
  }

  /** Feed with optional year filter + the distinct years available for the filter. */
  async list(year?: number): Promise<{ items: AnnouncementView[]; years: number[] }> {
    const qb = this.announcements.createQueryBuilder('a').orderBy('a.createdAt', 'DESC').take(50);
    if (year) qb.where('YEAR(a.created_at) = :year', { year });
    const rows = await qb.getMany();
    const yearRows: Array<{ y: number }> = await this.announcements.query(
      `SELECT DISTINCT YEAR(created_at) AS y FROM announcements ORDER BY y DESC`,
    );
    return {
      items: await Promise.all(rows.map((a) => this.toView(a))),
      years: yearRows.map((r) => Number(r.y)),
    };
  }

  async post(
    actor: { id: string; fullName: string; role: Role },
    input: { title: string; body: string; banner: boolean; email: boolean; urgent: boolean },
    photo?: Express.Multer.File,
  ): Promise<AnnouncementView> {
    const author = await this.users.findOne({ where: { id: actor.id } });
    const authorLabel = `${actor.fullName}${author?.position ? ` — ${author.position}` : ''}`;

    let photoKey: string | null = null;
    if (photo) {
      const ext = (photo.originalname.split('.').pop() ?? 'jpg').toLowerCase();
      photoKey = `announcements/${randomUUID()}.${ext}`;
      await this.storage.putObject(UPLOADS_BUCKET, photoKey, photo.buffer, photo.mimetype);
    }

    const saved = await this.announcements.save(
      this.announcements.create({
        title: input.title.trim(),
        body: input.body.trim(),
        urgent: input.urgent,
        channelBanner: input.banner,
        channelEmail: input.email,
        photoKey,
        authorId: actor.id,
        authorLabel,
      }),
    );

    const prefix = input.urgent ? '🚨 URGENT — ' : '📢 ';

    // Email fan-out: one MailJob per active resident, sent by the worker.
    let recipients = 0;
    if (input.email) {
      const residents = await this.users.find({
        where: { role: Role.RESIDENT, isActive: true },
        select: ['email', 'fullName'],
      });
      recipients = residents.length;
      await Promise.all(
        residents.map((r) =>
          this.queue.publish(QUEUES.email, {
            to: r.email,
            subject: `Barangay 591 — ${prefix}${saved.title}`,
            html: `
              <p>Hi ${r.fullName},</p>
              <h2 style="margin:8px 0">${input.urgent ? '🚨 ' : ''}${saved.title}</h2>
              <p style="white-space:pre-line">${saved.body}</p>
              <p style="color:#64748B">— ${authorLabel}, Barangay 591 · Sta. Mesa, Manila</p>
            `,
          }),
        ),
      );
    }

    // Urgent broadcasts also land in every resident's notification bell + live toast.
    if (input.urgent) {
      const residents = await this.users.find({
        where: { role: In([Role.RESIDENT]), isActive: true },
        select: ['id'],
      });
      await Promise.all(
        residents.map((r) => this.notifications.notify(r.id, `🚨 ${saved.title}`, 'announcement')),
      );
      await this.notifications.notifyStaff(`🚨 Urgent broadcast sent: ${saved.title}`, 'announcement');
    }

    const view = await this.toView(saved);
    this.gateway.emitAll('announcement:new', view);

    this.audit.log({
      actorLabel: authorLabel,
      actorId: actor.id,
      action: input.urgent ? 'Sent Urgent Broadcast' : 'Posted Announcement',
      target: `${saved.title} [${[input.banner && 'banner', input.email && `email ×${recipients}`, photoKey && 'photo'].filter(Boolean).join(', ') || 'feed only'}]`,
    });
    return view;
  }
}
