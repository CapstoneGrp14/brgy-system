import { Role } from '@brgy/shared';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { User } from '../users/user.entity';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
    // Absent in the worker process — notifications fall back to DB-only there.
    @Optional() private readonly gateway?: RealtimeGateway,
  ) {}

  /** Persist a notification for one user. Fire-and-forget safe. */
  async notify(userId: string, title: string, type = 'system'): Promise<void> {
    try {
      await this.repo.insert({ userId, title, type });
      this.gateway?.emitToUser(userId, 'notify', { title, type });
    } catch (err) {
      this.logger.error(`notify(${userId}) failed: ${String(err)}`);
    }
  }

  /** Notify every active staff account (employees + admins). */
  async notifyStaff(title: string, type = 'system'): Promise<void> {
    const staff = await this.users.find({
      where: { role: In([Role.EMPLOYEE, Role.ADMIN]), isActive: true },
      select: ['id'],
    });
    await Promise.all(staff.map((u) => this.repo.insert({ userId: u.id, title, type }).catch((err) => this.logger.error(String(err)))));
    this.gateway?.emitToStaff('notify', { title, type });
  }

  async listFor(userId: string) {
    const [items, unread] = await Promise.all([
      this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 20 }),
      this.repo
        .createQueryBuilder('n')
        .where('n.user_id = :userId AND n.read_at IS NULL', { userId })
        .getCount(),
    ]);
    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.type,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount: unread,
    };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('user_id = :userId AND read_at IS NULL', { userId })
      .execute();
  }
}
