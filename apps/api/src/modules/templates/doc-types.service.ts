import { DOCUMENT_TYPES, ReleaseMode, SlaClass } from '@brgy/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { DocumentTypeSetting } from './document-type-setting.entity';

export interface DocTypeView {
  key: string;
  labelText: string;
  sla: SlaClass;
  isCustom: boolean;
  isActive: boolean;
  releaseMode: ReleaseMode;
}

/**
 * Single source of truth for requestable document types: the five built-ins
 * from the design (@brgy/shared) merged with staff-added custom types stored
 * in document_type_settings.
 */
@Injectable()
export class DocTypesService {
  constructor(
    @InjectRepository(DocumentTypeSetting) private readonly settings: Repository<DocumentTypeSetting>,
    private readonly audit: AuditService,
  ) {}

  async all(includeInactive = false): Promise<DocTypeView[]> {
    const rows = await this.settings.find();
    const rowMap = new Map(rows.map((r) => [r.documentType, r]));
    const builtins: DocTypeView[] = DOCUMENT_TYPES.map((d) => ({
      key: d.key,
      labelText: d.labelText,
      sla: d.sla,
      isCustom: false,
      isActive: true,
      releaseMode: rowMap.get(d.key)?.releaseMode ?? ReleaseMode.DIGITAL,
    }));
    const customs: DocTypeView[] = rows
      .filter((r) => r.isCustom && (includeInactive || r.isActive))
      .map((r) => ({
        key: r.documentType,
        labelText: r.labelText ?? r.documentType,
        sla: (r.slaClass as SlaClass) ?? SlaClass.SIMPLE_3,
        isCustom: true,
        isActive: r.isActive,
        releaseMode: r.releaseMode,
      }));
    return [...builtins, ...customs];
  }

  async find(key: string): Promise<DocTypeView | undefined> {
    return (await this.all()).find((d) => d.key === key);
  }

  async addCustom(
    input: { labelText: string; slaClass: SlaClass; releaseMode: ReleaseMode },
    actor: { fullName: string; id: string; role: string },
  ): Promise<DocTypeView> {
    const labelText = input.labelText.trim();
    if (labelText.length < 4) throw new BadRequestException('Give the document a descriptive name.');
    const key =
      'CUSTOM_' +
      labelText
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48);

    const existing = await this.all(true);
    if (existing.some((d) => d.key === key || d.labelText.toLowerCase() === labelText.toLowerCase())) {
      throw new BadRequestException('A document type with this name already exists.');
    }

    await this.settings.save(
      this.settings.create({
        documentType: key,
        labelText,
        slaClass: input.slaClass,
        isCustom: true,
        isActive: true,
        releaseMode: input.releaseMode,
        updatedBy: actor.fullName,
      }),
    );
    this.audit.log({
      actorLabel: `${actor.fullName} (${actor.role === 'ADMIN' ? 'Admin' : 'Employee'})`,
      actorId: actor.id,
      action: 'Added Document Type',
      target: `${labelText} — ${input.slaClass}, ${input.releaseMode}`,
    });
    return (await this.find(key))!;
  }

  /** Enable/disable a custom type (built-ins can't be toggled). */
  async toggleCustom(key: string, actor: { fullName: string; id: string }): Promise<DocTypeView> {
    const row = await this.settings.findOne({ where: { documentType: key, isCustom: true } });
    if (!row) throw new BadRequestException('Only custom document types can be toggled.');
    row.isActive = !row.isActive;
    row.updatedBy = actor.fullName;
    await this.settings.save(row);
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: row.isActive ? 'Enabled Document Type' : 'Disabled Document Type',
      target: row.labelText ?? key,
    });
    return { key: row.documentType, labelText: row.labelText ?? key, sla: (row.slaClass as SlaClass) ?? SlaClass.SIMPLE_3, isCustom: true, isActive: row.isActive, releaseMode: row.releaseMode };
  }
}
