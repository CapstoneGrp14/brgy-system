import { Role } from '@brgy/shared';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { RequiresModule } from '../../common/module-access';
import { BookingsService } from './bookings.service';

class CreateBookingDto {
  @IsUUID()
  facilityId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Pick a requested date first.' })
  date: string;

  @IsString()
  @IsNotEmpty()
  timeSlot: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  purpose?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  fromSuggestion?: boolean;
}

class DecideBookingDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsBoolean()
  useSuggestion?: boolean;
}

class AddFacilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsIn(['FACILITY', 'EQUIPMENT'])
  type: 'FACILITY' | 'EQUIPMENT';
}

class SetBlockDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  slot: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsBoolean()
  remove?: boolean;
}

class AddSlotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  label: string;

  @IsBoolean()
  isOffPeak: boolean;
}

@Controller('bookings')
@RequiresModule('calendar')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('facilities')
  facilities() {
    return this.bookings.listFacilities();
  }

  @Get('slots')
  slots() {
    return this.bookings.listSlots();
  }

  // ── Admin configuration ──
  @Get('config')
  @Roles(Role.ADMIN)
  async config() {
    return {
      facilities: await this.bookings.listFacilities(true),
      slots: await this.bookings.listSlots(true),
    };
  }

  @Post('facilities')
  @Roles(Role.ADMIN)
  addFacility(@Body() dto: AddFacilityDto, @CurrentUser() user: RequestUser) {
    return this.bookings.addFacility(dto, user);
  }

  @Post('facilities/:id/toggle')
  @Roles(Role.ADMIN)
  toggleFacility(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.bookings.toggleFacility(id, user);
  }

  @Post('facilities/:id/blocks')
  @Roles(Role.ADMIN)
  setBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetBlockDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.setBlock(id, dto, user);
  }

  @Post('slots')
  @Roles(Role.ADMIN)
  addSlot(@Body() dto: AddSlotDto, @CurrentUser() user: RequestUser) {
    return this.bookings.addSlot(dto, user);
  }

  @Post('slots/:id/toggle')
  @Roles(Role.ADMIN)
  toggleSlot(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.bookings.toggleSlot(id, user);
  }

  @Post()
  @Roles(Role.RESIDENT)
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: RequestUser) {
    return this.bookings.create(user, dto);
  }

  @Get('mine')
  @Roles(Role.RESIDENT)
  mine(@CurrentUser() user: RequestUser) {
    return this.bookings.mine(user.id);
  }

  @Get('queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  queue() {
    return this.bookings.staffList();
  }

  @Post(':id/decide')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.decide(id, dto, user);
  }
}
