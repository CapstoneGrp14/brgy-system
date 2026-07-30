import { CharterContent, Role } from '@brgy/shared';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { CharterService } from './charter.service';

@Controller('charter')
export class CharterController {
  constructor(private readonly charter: CharterService) {}

  @Get()
  @Roles(Role.RESIDENT, Role.EMPLOYEE, Role.ADMIN)
  get() {
    return this.charter.get();
  }

  @Put()
  @Roles(Role.ADMIN)
  update(@Body() body: CharterContent, @CurrentUser() user: RequestUser) {
    return this.charter.update(body, user);
  }
}
