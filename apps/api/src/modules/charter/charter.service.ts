import { CharterContent } from '@brgy/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AppSetting } from './app-setting.entity';
import { DEFAULT_CHARTER } from './charter-default';

const KEY = 'charter';

@Injectable()
export class CharterService {
  constructor(
    @InjectRepository(AppSetting) private readonly settings: Repository<AppSetting>,
    private readonly audit: AuditService,
  ) {}

  async get(): Promise<CharterContent> {
    const row = await this.settings.findOne({ where: { key: KEY } });
    return (row?.value as CharterContent) ?? DEFAULT_CHARTER;
  }

  async update(content: CharterContent, actor: { fullName: string; id: string }): Promise<CharterContent> {
    const clean: CharterContent = {
      vision: content.vision?.trim() ?? '',
      mission: content.mission?.trim() ?? '',
      email: content.email?.trim() ?? '',
      address: content.address?.trim() ?? '',
      services: (content.services ?? [])
        .map((s) => ({
          service: s.service?.trim() ?? '',
          requirement: s.requirement?.trim() ?? '',
          client: s.client?.trim() ?? '',
          officer: s.officer?.trim() ?? '',
          steps: (s.steps ?? []).map((step) => step.trim()).filter(Boolean),
          fees: s.fees?.trim() || 'FREE',
          processingTime: s.processingTime?.trim() ?? '',
          form: s.form?.trim() ?? '',
        }))
        .filter((s) => s.service),
    };
    if (!clean.services.length) throw new BadRequestException('The charter needs at least one service.');

    await this.settings.save(this.settings.create({ key: KEY, value: clean }));
    this.audit.log({
      actorLabel: `${actor.fullName} (Admin)`,
      actorId: actor.id,
      action: "Updated Citizen's Charter",
      target: `${clean.services.length} frontline services`,
    });
    return clean;
  }
}
