import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

/** Anonymous aggregates for the login page hero — counts only, no PII. */
@Controller('public')
export class PublicStatsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Get('stats')
  stats() {
    return this.analytics.publicStats();
  }
}
