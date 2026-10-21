import { Body, Controller, Delete, Get, Headers, Post } from '@nestjs/common';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';
import { CurrentUser, Public, RequestUser } from '../../common/decorators';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  endpoint: string;

  @IsObject()
  keys: { p256dh: string; auth: string };
}

class UnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  endpoint: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /**
   * The VAPID public key the browser needs to create a subscription.
   * Public by design — it is the half meant to be handed out, and the browser
   * needs it before any session exists on a fresh device.
   */
  @Public()
  @Get('key')
  key() {
    return { publicKey: this.push.publicKey, enabled: this.push.isEnabled() };
  }

  @Post('subscribe')
  async subscribe(
    @Body() dto: SubscribeDto,
    @CurrentUser() user: RequestUser,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.push.subscribe(user.id, dto, userAgent);
    return { ok: true };
  }

  @Delete('subscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    await this.push.unsubscribe(dto.endpoint);
    return { ok: true };
  }
}
