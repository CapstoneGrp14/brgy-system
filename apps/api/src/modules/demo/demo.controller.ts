import { Role } from '@brgy/shared';
import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import { QUEUES, QueueService } from '../queue/queue.service';

/**
 * Phase 0 plumbing check: POST /api/v1/demo/jobs publishes to RabbitMQ,
 * the worker process consumes and logs it. Staff-only (also exercises
 * RolesGuard). Removed once real queues exist.
 */
@Roles(Role.EMPLOYEE, Role.ADMIN)
@Controller('demo')
export class DemoController {
  constructor(private readonly queue: QueueService) {}

  @Post('jobs')
  async enqueue(@Body() body: Record<string, unknown>) {
    const job = { kind: 'demo', payload: body, enqueuedAt: new Date().toISOString() };
    await this.queue.publish(QUEUES.demo, job);
    return { queued: true, job };
  }
}
