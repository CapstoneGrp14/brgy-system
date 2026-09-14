import { CensusCategory, MasterlistResponse, Role } from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { IsNotFutureDate } from '../../common/validators';
import { MasterlistService } from './masterlist.service';

class AddRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birthdate must be YYYY-MM-DD' })
  @IsNotFutureDate()
  birthdate?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  purok?: string;

  @IsEnum(CensusCategory)
  category: CensusCategory;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lguEligibility?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  householdCode?: string;
}

class ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(CensusCategory)
  category?: CensusCategory;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  account?: 'registered' | 'none';

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  pageSize?: number;
}

@Roles(Role.EMPLOYEE, Role.ADMIN)
@Controller('masterlist')
export class MasterlistController {
  constructor(private readonly masterlist: MasterlistService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<MasterlistResponse> {
    return this.masterlist.list(
      query.search ?? '',
      query.page ?? 1,
      query.pageSize ?? 8,
      query.category,
      query.account,
      query.status,
    );
  }

  @Post()
  add(@Body() dto: AddRecordDto, @CurrentUser() user: RequestUser) {
    return this.masterlist.addRecord(dto, user);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  import(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('mode') mode: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException({ message: 'Attach a CSV file.', errors: [], totalErrors: 0 });
    if (!/\.csv$/i.test(file.originalname)) {
      // Caught here so the reason names the actual file they picked.
      throw new BadRequestException({
        message: `"${file.originalname}" is not a .csv file.`,
        hint: 'In Excel choose File → Save As → CSV UTF-8 (Comma delimited), then upload that file.',
        errors: [],
        totalErrors: 0,
      });
    }
    const importMode = mode === 'refresh' ? 'refresh' : 'append';
    return this.masterlist.importCsv(file.buffer.toString('utf8'), user, importMode);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.masterlist.updateRecord(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.masterlist.deleteRecord(id, user);
  }

  @Get(':id/history')
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterlist.recordHistory(id);
  }

  @Get('export.csv')
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="census-masterlist.csv"')
  export() {
    return this.masterlist.exportCsv();
  }
}
