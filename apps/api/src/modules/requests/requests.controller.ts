import { Role } from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import {
  CreateCctvRequestDto,
  CreateDocumentRequestDto,
  CreateEquipmentRequestDto,
  CreateMedicineRequestDto,
  CreatePrintingRequestDto,
  QueueQueryDto,
} from './requests.dto';

import { checkSignature } from '../../common/file-signature';
import { RequiresModule } from '../../common/module-access';
import { HouseholdAuthorityService } from '../masterlist/household-authority.service';
import { RequestsService } from './requests.service';

/**
 * Print uploads are opened by barangay staff on their own machines, so the type
 * is verified from the file's leading bytes rather than the client-supplied
 * header. Legacy .doc is excluded deliberately — it is the format that carries
 * auto-executing macros, and checkSignature() names it in the error so the
 * resident knows to re-save rather than guessing.
 */
const PRINT_KINDS = ['pdf', 'docx'] as const;

@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly household: HouseholdAuthorityService,
  ) {}

  /** Minors in the caller's household they may file for; empty unless head. */
  @Get('dependants')
  @Roles(Role.RESIDENT)
  dependants(@CurrentUser() user: RequestUser) {
    return this.household.dependantsFor(user.id);
  }

  @Post('documents')
  @Roles(Role.RESIDENT)
  createDocument(@CurrentUser() user: RequestUser, @Body() dto: CreateDocumentRequestDto) {
    return this.requests.createDocumentRequest(user, dto);
  }

  @Post('cctv')
  @Roles(Role.RESIDENT)
  createCctv(@CurrentUser() user: RequestUser, @Body() dto: CreateCctvRequestDto) {
    return this.requests.createCctvRequest(user, dto);
  }

  @Post('medicine')
  @Roles(Role.RESIDENT)
  createMedicine(@CurrentUser() user: RequestUser, @Body() dto: CreateMedicineRequestDto) {
    return this.requests.createMedicineRequest(user, dto);
  }

  @Post('equipment')
  @Roles(Role.RESIDENT)
  createEquipment(@CurrentUser() user: RequestUser, @Body() dto: CreateEquipmentRequestDto) {
    return this.requests.createEquipmentRequest(user, dto);
  }

  @Post('printing')
  @Roles(Role.RESIDENT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  createPrinting(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePrintingRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const check = checkSignature(file.buffer, PRINT_KINDS, file.mimetype);
      if (!check.ok) throw new BadRequestException(check.reason);
    }
    return this.requests.createPrintingRequest(user, dto, file);
  }

  @Get(':id/print-file')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  async printFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.requests.printFile(id);
    res
      .header('Content-Type', file.mime)
      .header('Content-Disposition', `inline; filename="${file.filename.replace(/"/g, '')}"`)
      .send(file.buffer);
  }

  /** Generated certificate, streamed same-origin so the tab can auto-print. */
  @Get(':id/document-file')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  async documentFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const file = await this.requests.printDocument(id, user);
    res
      .header('Content-Type', file.mime)
      .header('Content-Disposition', `inline; filename="${file.filename.replace(/"/g, '')}"`)
      .send(file.buffer);
  }

  @Get('printing-queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @RequiresModule('student')
  printingQueue() {
    return this.requests.printingQueue();
  }

  @Get('health-queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @RequiresModule('health')
  healthQueue() {
    return this.requests.healthQueue();
  }

  @Get('mine')
  @Roles(Role.RESIDENT)
  mine(@CurrentUser() user: RequestUser) {
    return this.requests.myRequests(user.id);
  }

  @Get(':id/download')
  @Roles(Role.RESIDENT)
  download(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.requests.downloadUrl(id, user);
  }

  @Get(':id/print')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  print(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.requests.printUrl(id, user);
  }

  @Get('queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  queue(@Query() query: QueueQueryDto) {
    return this.requests.staffQueue(query.tab ?? 'all', query.page ?? 1, query.pageSize ?? 5, {
      q: query.q,
      deadline: query.deadline,
    });
  }

  @Get('stats')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  stats() {
    return this.requests.staffStats();
  }

  @Get('export.csv')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="requests-queue.csv"')
  exportCsv() {
    return this.requests.exportCsv();
  }

  @Post(':id/advance')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  advance(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.requests.advance(id, user);
  }

  /** Staff attaches the signed & sealed scan (the resident's official copy). */
  @Post(':id/document')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadSigned(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('Attach the signed copy (PDF or JPG/PNG scan).');
    return this.requests.uploadSignedDocument(id, file, user);
  }
}
