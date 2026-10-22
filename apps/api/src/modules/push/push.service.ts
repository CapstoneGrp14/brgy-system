import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './push-subscription.entity';

export interface PushPayload {
  title: string;
  body: string;
  /** Path the browser opens when the notification is clicked. */
  url?: string;
  tag?: string;
}

/**
 * Browser push, used for urgent announcements.
 *
 * Push is strictly additive: if VAPID keys are absent the service reports
 * itself disabled and every send is a no-op, so a deployment without keys
 * still broadcasts by banner, in-app bell and email exactly as before.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subs: Repository<PushSubscription>,
    config: ConfigService,
  ) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY', '');
    this.enabled = !!publicKey && !!privateKey;
    if (this.enabled) {
      webpush.setVapidDetails(
        config.get<string>('VAPID_SUBJECT', 'mailto:brgy591dist6@gmail.com'),
        publicKey,
        privateKey,
      );
    } else {
      this.logger.warn('VAPID keys not set — push notifications are disabled.');
    }
    this.publicKey = publicKey;
  }

  readonly publicKey: string;

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Register (or refresh) this browser's endpoint for the signed-in resident. */
  async subscribe(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ): Promise<void> {
    const existing = await this.subs.findOne({ where: { endpoint: sub.endpoint } });
    if (existing) {
      // Same browser, possibly a different account or rotated keys.
      await this.subs.update(
        { id: existing.id },
        { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 255) ?? null },
      );
      return;
    }
    await this.subs.insert({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent?.slice(0, 255) ?? null,
    });
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.subs.delete({ endpoint });
  }

  /**
   * Send to every endpoint belonging to these users.
   *
   * A push service returns 404/410 for an endpoint the browser has discarded
   * (cleared data, uninstalled). Those are pruned rather than retried — keeping
   * them would mean the table grows forever and every broadcast slows down.
   */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<{ sent: number; pruned: number }> {
    if (!this.enabled || !userIds.length) return { sent: 0, pruned: 0 };
    return this.deliver(await this.subs.find({ where: { userId: In(userIds) } }), payload);
  }

  /**
   * Send to every registered device, whoever it belongs to.
   *
   * For a barangay-wide emergency advisory the audience is not a role — it is
   * everyone who asked to be told. Scoping the fan-out by `role = RESIDENT`
   * silently skipped two groups who had opted in: a staff member who is also a
   * resident of the barangay (dual role), and any employee who turned alerts
   * on. Subscribing is the consent, so the subscription is the address list.
   */
  async sendToAll(payload: PushPayload): Promise<{ sent: number; pruned: number }> {
    if (!this.enabled) return { sent: 0, pruned: 0 };
    return this.deliver(await this.subs.find(), payload);
  }

  private async deliver(
    rows: PushSubscription[],
    payload: PushPayload,
  ): Promise<{ sent: number; pruned: number }> {
    if (!rows.length) return { sent: 0, pruned: 0 };

    const body = JSON.stringify(payload);
    let sent = 0;
    const dead: string[] = [];

    await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            body,
            { TTL: 3600, urgency: 'high' },
          );
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) dead.push(row.id);
          else {
            // Name the host: a bare "Push failed (unknown)" gives no way to tell
            // one dead endpoint from a misconfigured deployment.
            let host = row.endpoint;
            try {
              host = new URL(row.endpoint).host;
            } catch {
              /* keep the raw value if it will not parse */
            }
            this.logger.warn(
              `Push failed for ${host} (${status ?? 'no status'}): ${String(err?.message ?? err)}`,
            );
          }
        }
      }),
    );

    if (dead.length) await this.subs.delete({ id: In(dead) });
    if (sent) await this.subs.update({ id: In(rows.map((r) => r.id)) }, { lastUsedAt: new Date() });
    return { sent, pruned: dead.length };
  }
}
