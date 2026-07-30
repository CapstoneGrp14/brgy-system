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

const PRINT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

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
    if (file && !PRINT_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Upload a PDF or Word document.');
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

  @Get('printing-queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  printingQueue() {
    return this.requests.printingQueue();
  }

  @Get('health-queue')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
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
    return this.requests.staffQueue(query.tab ?? 'all', query.page ?? 1, query.pageSize ?? 5);
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
