import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUES, QueueService } from '../queue/queue.service';
import { MailJob, MailService } from './mail.service';

/** Worker-side consumer for the `email` queue. */
@Injectable()
export class EmailConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(
    private readonly queue: QueueService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.consume(QUEUES.email, async (msg) => {
      const job = msg as MailJob;
      if (!job?.to || !job?.subject) {
        this.logger.warn(`Skipping malformed mail job: ${JSON.stringify(msg)}`);
        return;
      }
      await this.mail.send(job);
    });
  }
}
