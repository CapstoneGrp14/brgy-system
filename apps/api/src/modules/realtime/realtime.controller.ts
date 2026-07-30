import { Role } from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { AssistantService } from './assistant.service';
import { ChatService } from './chat.service';
import { SosService } from './sos.service';

class TriggerSosDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accuracy?: number;
}

class ChatSendDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;
}

class AssistantAskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  message: string;

  @IsOptional()
  @IsString()
  language?: 'en' | 'fil';
}

@Controller()
export class RealtimeController {
  constructor(
    private readonly sos: SosService,
    private readonly chat: ChatService,
    private readonly assistant: AssistantService,
  ) {}

  // ── SOS (available to unverified residents by design, FR-2.4) ──
  @Post('sos')
  @Roles(Role.RESIDENT)
  trigger(@Body() dto: TriggerSosDto, @CurrentUser() user: RequestUser) {
    return this.sos.trigger(user, {
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      accuracy: dto.accuracy ?? null,
    });
  }

  @Get('sos/mine')
  @Roles(Role.RESIDENT)
  mine(@CurrentUser() user: RequestUser) {
    return this.sos.mine(user.id);
  }

  @Post('sos/cancel')
  @Roles(Role.RESIDENT)
  async cancel(@CurrentUser() user: RequestUser) {
    return this.sos.resolve(
      (await this.sos.mine(user.id))?.id ?? '00000000-0000-0000-0000-000000000000',
      { label: `${user.fullName} (Resident)`, actorId: user.id },
      { onlyOwner: user.id },
    );
  }

  @Get('sos/active')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  active() {
    return this.sos.active();
  }

  @Post('sos/:id/resolve')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  resolve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.sos.resolve(id, { label: user.fullName, actorId: user.id });
  }

  // ── Staff chat (FR-10.2) ──
  @Get('chat/staff')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  history() {
    return this.chat.history();
  }

  @Post('chat/staff')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  send(@Body() dto: ChatSendDto, @CurrentUser() user: RequestUser) {
    return this.chat.send(user, dto.body);
  }

  // ── 591 Assistant (FR-10.1) ──
  @Post('assistant')
  @Roles(Role.RESIDENT)
  ask(@Body() dto: AssistantAskDto, @CurrentUser() user: RequestUser) {
    return this.assistant.ask(user.id, dto.message, dto.language === 'fil' ? 'fil' : 'en');
  }

  @Get('assistant/stats')
  @Roles(Role.ADMIN)
  stats() {
    return this.assistant.stats();
  }

  // ── Admin-managed grounding knowledge (.md files in MinIO) ──
  @Get('assistant/kb')
  @Roles(Role.ADMIN)
  kbList() {
    return this.assistant.listKbFiles();
  }

  @Post('assistant/kb')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 } }))
  async kbUpload(@CurrentUser() user: RequestUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Attach a Markdown (.md) file.');
    await this.assistant.uploadKbFile(file, user);
    return { ok: true };
  }

  @Delete('assistant/kb/:name')
  @Roles(Role.ADMIN)
  async kbDelete(@Param('name') name: string, @CurrentUser() user: RequestUser) {
    await this.assistant.deleteKbFile(name, user);
    return { ok: true };
  }
}
