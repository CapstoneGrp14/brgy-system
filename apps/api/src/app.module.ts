import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CharterModule } from './modules/charter/charter.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { DemoModule } from './modules/demo/demo.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MailModule } from './modules/mail/mail.module';
import { MasterlistModule } from './modules/masterlist/masterlist.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueueModule } from './modules/queue/queue.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RequestsModule } from './modules/requests/requests.module';
import { StorageModule } from './modules/storage/storage.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { UsersModule } from './modules/users/users.module';
import { VerificationModule } from './modules/verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    // Baseline ceiling per IP. Deliberately generous — dashboards poll and the
    // resident feed loads several endpoints at once, so this is an abuse brake,
    // not a usage quota. Routes worth protecting (sign-in, the assistant) set
    // their own much tighter @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
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
    QueueModule,
    AuditModule,
    MailModule,
    StorageModule,
    RealtimeModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    RequestsModule,
    TemplatesModule,
    MasterlistModule,
    VerificationModule,
    ComplaintsModule,
    BookingsModule,
    InventoryModule,
    HealthModule,
    AnnouncementsModule,
    AnalyticsModule,
    CharterModule,
    DemoModule,
  ],
  providers: [
    // Throttler first: sign-in is unauthenticated, so brute-force attempts must
    // be counted before the JWT guard would reject them.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
