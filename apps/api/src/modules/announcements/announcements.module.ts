import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { User } from '../users/user.entity';
import { Announcement } from './announcement.entity';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, User]), QueueModule, AuditModule, PushModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
