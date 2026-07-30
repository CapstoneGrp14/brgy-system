import type { HealthStatus } from '@brgy/shared';
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators';
import { QueueService } from '../queue/queue.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly queue: QueueService,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    let db: HealthStatus['db'] = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    return {
      status: 'ok',
      service: 'api',
      db,
      queue: this.queue.isConnected() ? 'up' : 'down',
      time: new Date().toISOString(),
    };
  }
}
