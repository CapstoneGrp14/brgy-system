import { Role } from '@brgy/shared';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
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
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly queue: QueueService,
    private readonly push: PushService,
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

      // ...and out to the phone. The bell and the email only reach someone who
      // is already looking; an evacuation notice has to reach a resident whose
      // phone is in their pocket. Deliberately not awaited into the response —
      // posting the announcement must not fail or stall because a push service
      // is slow, and the broadcast has already been recorded by this point.
      void this.push
        .sendToUsers(residents.map((r) => r.id), {
          title: `🚨 ${saved.title}`,
          body: input.body.slice(0, 180),
          url: '/resident/announcements',
          // One tag per announcement: a re-send replaces the old notification
          // rather than stacking duplicates on the lock screen.
          tag: `announcement-${saved.id}`,
        })
        .then(({ sent, pruned }) =>
          this.logger.log(`Urgent push: ${sent} delivered, ${pruned} dead endpoint(s) pruned`),
        )
        .catch((err) => this.logger.warn(`Urgent push failed: ${String(err)}`));
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

  /**
   * Edit an existing post (staff only). Does NOT re-run the email/urgent fan-out —
   * editing is a correction, not a re-broadcast, so residents aren't re-notified.
   */
  async update(
    actor: { id: string; fullName: string; role: Role },
    id: string,
    input: { title: string; body: string; banner: boolean; email: boolean; urgent: boolean; removePhoto?: boolean },
    photo?: Express.Multer.File,
  ): Promise<AnnouncementView> {
    const post = await this.announcements.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Announcement not found.');

    if (photo) {
      // Replace the banner image; drop the old object so MinIO doesn't accumulate orphans.
      if (post.photoKey) await this.storage.removeObject(UPLOADS_BUCKET, post.photoKey).catch(() => undefined);
      const ext = (photo.originalname.split('.').pop() ?? 'jpg').toLowerCase();
      const photoKey = `announcements/${randomUUID()}.${ext}`;
      await this.storage.putObject(UPLOADS_BUCKET, photoKey, photo.buffer, photo.mimetype);
      post.photoKey = photoKey;
    } else if (input.removePhoto && post.photoKey) {
      await this.storage.removeObject(UPLOADS_BUCKET, post.photoKey).catch(() => undefined);
      post.photoKey = null;
    }

    post.title = input.title.trim();
    post.body = input.body.trim();
    post.urgent = input.urgent;
    post.channelBanner = input.banner;
    post.channelEmail = input.email;

    const saved = await this.announcements.save(post);
    const view = await this.toView(saved);
    this.gateway.emitAll('announcement:update', view);

    this.audit.log({
      actorLabel: actor.fullName,
      actorId: actor.id,
      action: 'Edited Announcement',
      target: saved.title,
    });
    return view;
  }

  /** Remove a post (staff only) and its banner image. */
  async remove(actor: { id: string; fullName: string; role: Role }, id: string): Promise<{ id: string }> {
    const post = await this.announcements.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Announcement not found.');

    if (post.photoKey) await this.storage.removeObject(UPLOADS_BUCKET, post.photoKey).catch(() => undefined);
    await this.announcements.remove(post);
    this.gateway.emitAll('announcement:delete', { id });

    this.audit.log({
      actorLabel: actor.fullName,
      actorId: actor.id,
      action: 'Deleted Announcement',
      target: post.title,
    });
    return { id };
  }
}
