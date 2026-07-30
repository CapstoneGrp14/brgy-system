import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CharterModule } from '../charter/charter.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssistantQuery } from './assistant-query.entity';
import { AssistantService } from './assistant.service';
import { ChatMessage } from './chat-message.entity';
import { ChatService } from './chat.service';
import { RealtimeController } from './realtime.controller';
import { RealtimeGateway } from './realtime.gateway';
import { SosAlert } from './sos-alert.entity';
import { SosService } from './sos.service';

/** Global so NotificationsService can push live events without import cycles. */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SosAlert, ChatMessage, AssistantQuery]),
    JwtModule.register({}),
    AuditModule,
    CharterModule,
    NotificationsModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeGateway, SosService, ChatService, AssistantService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
