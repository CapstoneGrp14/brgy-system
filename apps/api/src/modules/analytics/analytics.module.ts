import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PublicStatsController } from './public-stats.controller';

@Module({
  controllers: [AnalyticsController, PublicStatsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
