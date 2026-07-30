import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUES, QueueService } from '../queue/queue.service';

@Injectable()
export class DemoConsumer implements OnModuleInit {
  private readonly logger = new Logger(DemoConsumer.name);

  constructor(private readonly queue: QueueService) {}

  async onModuleInit(): Promise<void> {
    await this.queue.consume(QUEUES.demo, async (msg) => {
      this.logger.log(`Processed demo job: ${JSON.stringify(msg)}`);
    });
  }
}
