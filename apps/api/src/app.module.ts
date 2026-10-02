import { Module } from '@nestjs/common';
import { HealthController } from './http/health.controller';
import { PlanController } from './http/plan.controller';
import { StopsController } from './http/stops.controller';
import { ReportsController } from './http/reports.controller';

@Module({
  controllers: [
    HealthController,
    PlanController,
    StopsController,
    ReportsController,
  ],
})
export class AppModule {}
