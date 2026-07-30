import { NotificationsResponse } from '@brgy/shared';
import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../common/decorators';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<NotificationsResponse> {
    return this.notifications.listFor(user.id);
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: RequestUser) {
    await this.notifications.markAllRead(user.id);
    return { ok: true };
  }
}
