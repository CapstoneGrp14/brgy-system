import { CharterContent, Role } from '@brgy/shared';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { RequiresModule } from '../../common/module-access';
import { CharterService } from './charter.service';

@Controller('charter')
@RequiresModule('charter')
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
