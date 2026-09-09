import { Role } from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { AnnouncementsService } from './announcements.service';

const toBool = ({ value }: { value: unknown }) => value === true || value === 'true';

const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

class PostAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;

  @Transform(toBool)
  @IsBoolean()
  banner: boolean;

  @Transform(toBool)
  @IsBoolean()
  email: boolean;

  @Transform(toBool)
  @IsBoolean()
  urgent: boolean;
}

class UpdateAnnouncementDto extends PostAnnouncementDto {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  removePhoto?: boolean;
}

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  /** Feed is visible to every signed-in role (residents incl. unverified). */
  @Get()
  @Roles(Role.RESIDENT, Role.EMPLOYEE, Role.ADMIN)
  list(@Query() query: ListQueryDto) {
    return this.announcements.list(query.year);
  }

  @Post()
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  post(
    @Body() dto: PostAnnouncementDto,
    @CurrentUser() user: RequestUser,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (photo && !PHOTO_MIMES.includes(photo.mimetype)) {
      throw new BadRequestException('Banner photo must be a JPG, PNG, or WebP image.');
    }
    return this.announcements.post(user, dto, photo);
  }

  @Patch(':id')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: RequestUser,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (photo && !PHOTO_MIMES.includes(photo.mimetype)) {
      throw new BadRequestException('Banner photo must be a JPG, PNG, or WebP image.');
    }
    return this.announcements.update(user, id, dto, photo);
  }

  @Delete(':id')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.announcements.remove(user, id);
  }
}
