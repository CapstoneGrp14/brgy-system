import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

/**
 * Worker entrypoint — no HTTP server. Consumes RabbitMQ queues and (from
 * Phase 2) runs scheduled jobs like the ARTA overdue sweep.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  console.log('[worker] started — consuming queues');
}

bootstrap();
