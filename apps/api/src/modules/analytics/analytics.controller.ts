import { Role } from '@brgy/shared';
import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

@Controller('analytics')
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@Query('month') month?: string) {
    return this.analytics.overview(month);
  }

  @Get('summary')
  summary(@Query('month') month?: string) {
    return this.analytics.summary(month);
  }

  @Get('arta-report')
  artaReport(@Query('year') year?: string) {
    return this.analytics.artaReport(year ? Number(year) : undefined);
  }

  @Get('arta-summary')
  artaSummary(@Query('year') year?: string) {
    return this.analytics.artaSummary(year ? Number(year) : undefined);
  }

  @Get('arta-report.csv')
  async artaReportCsv(@Res() res: Response, @Query('year') year?: string) {
    const { items: rows } = await this.analytics.artaReport(year ? Number(year) : undefined);
    const header = ['Resident', 'Service', 'SLA Class', 'Status', 'Filed', 'ARTA Due', 'Completed', 'On Time'];
    const lines = rows.map((r) =>
      [r.resident, r.title, r.slaClass, r.status, r.filedAt, r.dueAt, r.completedAt ?? '', r.onTime === null ? '' : r.onTime ? 'YES' : 'NO']
        .map(csvCell)
        .join(','),
    );
    res
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="arta-sla-report${year ? `-${year}` : ''}.csv"`)
      .send([header.map(csvCell).join(','), ...lines].join('\n'));
  }

  @Get('report.csv')
  async reportCsv(@Res() res: Response, @Query('month') month?: string) {
    const o = await this.analytics.overview(month);
    const lines: string[] = [
      `"Barangay 591 Monthly Report — ${o.month}"`,
      '',
      '"Metric","Value"',
      `"Registered residents",${o.cards.residents}`,
      `"Documents issued (month)",${o.cards.documentsIssued}`,
      `"Complaints filed (month)",${o.cards.complaintsFiled}`,
      `"ARTA compliance (month)","${o.cards.artaCompliance === null ? 'n/a' : `${o.cards.artaCompliance}%`}"`,
      `"Chatbot queries (all-time)",${o.cards.chatbotQueries}`,
      `"Chatbot self-service rate","${o.cards.chatbotResolvedRate}%"`,
      '',
      '"ARTA Compliance by Class","Filed","Completed","On Time","Rate"',
      ...o.compliance.map((c) => `${csvCell(c.slaClass)},${c.filed},${c.completed},${c.onTime},"${c.rate === null ? 'n/a' : `${c.rate}%`}"`),
      '',
      '"Service","Total Requests"',
      ...o.serviceDemand.map((s) => `${csvCell(s.service)},${s.count}`),
      '',
      '"Inventory Item","Stock","Threshold"',
      ...o.inventoryLevels.map((i) => `${csvCell(i.name)},${i.stockQty},${i.threshold}`),
    ];
    res
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="brgy591-report-${o.month}.csv"`)
      .send(lines.join('\n'));
  }
}
