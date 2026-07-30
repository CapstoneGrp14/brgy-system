import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export const QUEUES = {
  demo: 'demo',
  email: 'email',
  pdf: 'pdf',
  ocr: 'ocr',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Thin RabbitMQ wrapper shared by the API (publish) and the worker (consume).
 * Reconnects with backoff so the app survives broker restarts.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private closing = false;
  private readonly consumers: Array<{ queue: QueueName; handler: (msg: unknown) => Promise<void> }> =
    [];

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  isConnected(): boolean {
    return this.channel !== null;
  }

  async publish(queue: QueueName, payload: unknown): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not available');
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
  }

  /** Register a consumer; re-registered automatically after reconnects. */
  async consume(queue: QueueName, handler: (msg: unknown) => Promise<void>): Promise<void> {
    this.consumers.push({ queue, handler });
    if (this.channel) await this.bindConsumer(this.channel, queue, handler);
  }

  private async connect(attempt = 1): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
    try {
      this.connection = await amqp.connect(url);
      this.connection.on('close', () => {
        this.channel = null;
        this.connection = null;
        if (!this.closing) {
          this.logger.warn('RabbitMQ connection closed — reconnecting…');
          setTimeout(() => void this.connect(), 3000);
        }
      });
      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(5);
      for (const { queue, handler } of this.consumers) {
        await this.bindConsumer(this.channel, queue, handler);
      }
      this.logger.log('Connected to RabbitMQ');
    } catch (err) {
      const delay = Math.min(30_000, attempt * 3000);
      this.logger.warn(`RabbitMQ connect failed (attempt ${attempt}): ${String(err)} — retrying in ${delay}ms`);
      if (!this.closing) setTimeout(() => void this.connect(attempt + 1), delay);
    }
  }

  private async bindConsumer(
    channel: amqp.Channel,
    queue: QueueName,
    handler: (msg: unknown) => Promise<void>,
  ): Promise<void> {
    await channel.assertQueue(queue, { durable: true });
    await channel.consume(queue, (raw) => {
      if (!raw) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.content.toString());
      } catch {
        this.logger.error(`Dropping malformed message on "${queue}"`);
        channel.ack(raw);
        return;
      }
      handler(parsed)
        .then(() => channel.ack(raw))
        .catch((err) => {
          this.logger.error(`Handler for "${queue}" failed: ${String(err)}`);
          // Phase 2+: retry with backoff + dead-letter queue. For now, drop.
          channel.ack(raw);
        });
    });
  }
}
