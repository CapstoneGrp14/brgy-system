import { Role } from '@brgy/shared';
import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators';
import { AuditService } from './audit.service';

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

@Controller('audit')
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.audit.list(q);
  }

  @Get('export.csv')
  async exportCsv(@Res() res: Response, @Query('q') q?: string) {
    const rows = await this.audit.list(q, 500);
    const lines = rows.map((r) => [r.at, r.actorLabel, r.action, r.target ?? ''].map(csvCell).join(','));
    res
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="audit-log.csv"')
      .send(['"Timestamp","Actor","Action","Target"', ...lines].join('\n'));
  }
}
