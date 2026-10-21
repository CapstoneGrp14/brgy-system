import { randomUUID } from 'crypto';
import { ReleaseMode, Role, SlaClass } from '@brgy/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { IsEnum } from 'class-validator';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { RequiresModule } from '../../common/module-access';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { DocTypesService } from './doc-types.service';
import { DocumentTemplate } from './document-template.entity';
import { DocumentTypeSetting } from './document-type-setting.entity';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Placeholders the generator fills — shown as a reference in the panel. */
export const TEMPLATE_PLACEHOLDERS = [
  '{resident_name}',
  '{address}',
  '{purok}',
  '{purpose}',
  '{document_title}',
  '{date_issued}',
  '{document_id}',
  '{chairman_name}',
  '{secretary_name}',
];

class UploadTemplateDto {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

class ReleaseModeDto {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsEnum(ReleaseMode)
  releaseMode: ReleaseMode;
}

class AddDocTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  labelText: string;

  @IsEnum(SlaClass)
  slaClass: SlaClass;

  @IsEnum(ReleaseMode)
  releaseMode: ReleaseMode;
}

@Controller('templates')
@RequiresModule('templates')
export class TemplatesController {
  constructor(
    @InjectRepository(DocumentTemplate) private readonly templates: Repository<DocumentTemplate>,
    @InjectRepository(DocumentTypeSetting)
    private readonly settings: Repository<DocumentTypeSetting>,
    private readonly docTypes: DocTypesService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Requestable document types — residents' form is driven by this. */
  @Get('document-types')
  @Roles(Role.RESIDENT, Role.EMPLOYEE, Role.ADMIN)
  documentTypes() {
    return this.docTypes.all();
  }

  /** Employees AND admin can offer new document types to residents. */
  @Post('document-types')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  addDocumentType(@Body() dto: AddDocTypeDto, @CurrentUser() user: RequestUser) {
    return this.docTypes.addCustom(dto, user);
  }

  /** Enable/disable a custom type (admin). */
  @Post('document-types/:key/toggle')
  @Roles(Role.ADMIN)
  toggleDocumentType(@Param('key') key: string, @CurrentUser() user: RequestUser) {
    return this.docTypes.toggleCustom(key, user);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  async list() {
    const [rows, types] = await Promise.all([
      this.templates.find({ order: { createdAt: 'DESC' } }),
      this.docTypes.all(true),
    ]);
    return {
      placeholders: TEMPLATE_PLACEHOLDERS,
      releaseModes: types.map((d) => ({
        documentType: d.key,
        labelText: d.labelText,
        releaseMode: d.releaseMode,
        isCustom: d.isCustom,
        isActive: d.isActive,
      })),
      items: rows.map((t) => ({
        id: t.id,
        documentType: t.documentType,
        name: t.name,
        originalFilename: t.originalFilename,
        isActive: t.isActive,
        uploadedBy: t.uploadedBy,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  @Post()
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('Attach a .docx template file.');
    const isDocx = file.mimetype === DOCX_MIME || file.originalname.toLowerCase().endsWith('.docx');
    if (!isDocx) throw new BadRequestException('Templates must be Word (.docx) files.');

    const meta = await this.docTypes.find(dto.documentType);
    if (!meta) throw new BadRequestException('Unknown document type.');
    const key = `templates/${randomUUID()}.docx`;
    await this.storage.putObject(this.storage.uploadsBucket, key, file.buffer, DOCX_MIME);

    // New uploads become the active template for their type.
    await this.templates.update({ documentType: dto.documentType }, { isActive: false });
    const row = await this.templates.save(
      this.templates.create({
        documentType: dto.documentType,
        name: dto.name?.trim() || `${meta.labelText} template`,
        originalFilename: file.originalname,
        storageKey: key,
        isActive: true,
        uploadedBy: user.fullName,
      }),
    );

    this.audit.log({
      actorLabel: `${user.fullName} (${user.role === Role.ADMIN ? 'Admin' : 'Employee'})`,
      actorId: user.id,
      action: 'Uploaded Document Template',
      target: `${meta.labelText} — ${file.originalname}`,
    });
    return { id: row.id, ok: true };
  }

  @Post('settings')
  @Roles(Role.ADMIN)
  async setReleaseMode(@Body() dto: ReleaseModeDto, @CurrentUser() user: RequestUser) {
    const meta = await this.docTypes.find(dto.documentType);
    if (!meta) throw new BadRequestException('Unknown document type.');
    const existing = await this.settings.findOne({ where: { documentType: dto.documentType } });
    await this.settings.save(
      this.settings.create({
        ...(existing ?? { documentType: dto.documentType }),
        releaseMode: dto.releaseMode,
        updatedBy: user.fullName,
      }),
    );
    this.audit.log({
      actorLabel: `${user.fullName} (Admin)`,
      actorId: user.id,
      action: 'Changed Document Release Mode',
      target: `${meta.labelText} → ${dto.releaseMode === ReleaseMode.PICKUP ? 'Pickup at Hall' : 'Digital Download'}`,
    });
    return { ok: true };
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  async activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    const row = await this.templates.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Template not found.');
    await this.templates.update({ documentType: row.documentType }, { isActive: false });
    await this.templates.update({ id }, { isActive: true });
    this.audit.log({
      actorLabel: `${user.fullName} (Admin)`,
      actorId: user.id,
      action: 'Activated Document Template',
      target: `${row.documentType} — ${row.name}`,
    });
    return { ok: true };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    const row = await this.templates.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Template not found.');
    await this.templates.delete({ id });
    await this.storage.removeObject(this.storage.uploadsBucket, row.storageKey).catch(() => undefined);
    this.audit.log({
      actorLabel: `${user.fullName} (Admin)`,
      actorId: user.id,
      action: 'Deleted Document Template',
      target: `${row.documentType} — ${row.name}`,
    });
    return { ok: true };
  }
}
