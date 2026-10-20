import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from './modules/audit/audit.module';
import { Complaint } from './modules/complaints/complaint.entity';
import { DemoConsumer } from './modules/demo/demo.consumer';
import { EmailConsumer } from './modules/mail/email.consumer';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PdfConsumer } from './modules/pdf/pdf.consumer';
import { QueueModule } from './modules/queue/queue.module';
import { CensusRecord } from './modules/masterlist/census-record.entity';
import { Household } from './modules/masterlist/household.entity';
import { ArtaSweeper } from './modules/requests/arta-sweeper';
import { RequestEvent } from './modules/requests/request-event.entity';
import { ServiceRequest } from './modules/requests/service-request.entity';
import { StorageModule } from './modules/storage/storage.module';
import { DocumentTemplate } from './modules/templates/document-template.entity';
import { DocumentTypeSetting } from './modules/templates/document-type-setting.entity';
import { ResidentProfile } from './modules/users/resident-profile.entity';
import { User } from './modules/users/user.entity';
import { OcrConsumer } from './modules/verification/ocr.consumer';
import { Upload } from './modules/verification/upload.entity';
import { VerificationDocType } from './modules/verification/verification-doc-type.entity';
import { VerificationSubmission } from './modules/verification/verification-submission.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 3306)),
        username: config.get('DB_USER', 'brgy'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'brgy591'),
        autoLoadEntities: true,
        synchronize: false,
        retryAttempts: 20,
        retryDelay: 3000,
      }),
    }),
    TypeOrmModule.forFeature([ServiceRequest, RequestEvent, ResidentProfile, CensusRecord, Household, User, DocumentTemplate, DocumentTypeSetting, VerificationSubmission, VerificationDocType, Upload, Complaint]),
    ScheduleModule.forRoot(),
    QueueModule,
    AuditModule,
    MailModule,
    StorageModule,
    NotificationsModule,
  ],
  providers: [DemoConsumer, EmailConsumer, PdfConsumer, OcrConsumer, ArtaSweeper],
})
export class WorkerModule {}
