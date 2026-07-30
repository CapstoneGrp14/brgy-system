import { COMPLAINT_CATEGORIES, ComplaintStatus, Role } from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { COMPLAINT_ACTIONS, ComplaintsService } from './complaints.service';

const EVIDENCE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'];

class FileComplaintDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  respondentName: string;

  @IsString()
  @MinLength(20, { message: 'Please describe the incident in at least 20 characters.' })
  @MaxLength(1000)
  description: string;

  @IsIn(COMPLAINT_CATEGORIES as unknown as string[])
  category: string;

  @IsOptional()
  @Matches(/^09\d{9}$/, { message: 'Contact number must look like 09XXXXXXXXX' })
  contactNumber?: string;
}

class BlotterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  caseTitle: string;

  @IsIn(COMPLAINT_CATEGORIES as unknown as string[])
  category: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  respondentName: string;
}

class AssignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  luponAssignee: string;
}

class AdvanceDto {
  @IsEnum(ComplaintStatus)
  next: ComplaintStatus;
}

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post()
  @Roles(Role.RESIDENT)
  @UseInterceptors(FileInterceptor('evidence', { limits: { fileSize: 15 * 1024 * 1024 } }))
  file(
    @Body() dto: FileComplaintDto,
    @CurrentUser() user: RequestUser,
    @UploadedFile() evidence?: Express.Multer.File,
  ) {
    if (evidence && !EVIDENCE_MIMES.includes(evidence.mimetype)) {
      throw new BadRequestException('Evidence must be a photo, PDF, or MP4 video.');
    }
    return this.complaints.fileComplaint(user, { ...dto, evidence });
  }

  @Get('mine')
  @Roles(Role.RESIDENT)
  mine(@CurrentUser() user: RequestUser) {
    return this.complaints.myComplaints(user.id);
  }

  @Get('queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  queue() {
    return this.complaints.staffQueue();
  }

  /** Available staff actions per status — the UI renders from this. */
  @Get('actions')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  actions() {
    return COMPLAINT_ACTIONS;
  }

  @Post('blotter')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  blotter(@Body() dto: BlotterDto, @CurrentUser() user: RequestUser) {
    return this.complaints.encodeBlotter(user, dto);
  }

  @Post(':id/assign')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.complaints.assignLupon(id, dto.luponAssignee, user);
    return { ok: true };
  }

  @Post(':id/advance')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  advance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdvanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.complaints.advance(id, dto.next, user);
  }
}
