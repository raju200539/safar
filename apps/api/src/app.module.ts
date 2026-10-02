import { Module } from '@nestjs/common';
import { HealthController } from './http/health.controller';
import { PlanController } from './http/plan.controller';
import { StopsController } from './http/stops.controller';
import { PlacesController } from './http/places.controller';
import { ReportsController } from './http/reports.controller';

@Module({
  controllers: [
    HealthController,
    PlanController,
    StopsController,
    PlacesController,
    ReportsController,
  ],
})
export class AppModule {}
