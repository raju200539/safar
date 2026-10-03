import { Controller, Get, Query } from '@nestjs/common';
import { PlanTrip } from '../application/plan-trip';
import { OtpClient } from '../adapters/otp/otp-client';
import { OtpPlanner } from '../adapters/otp/otp-planner';
import { PlanQueryDto } from './dto/plan-query.dto';
import { ApiException } from './api-exception';
import type { Itinerary } from '@hyd/shared';

@Controller('v1')
export class PlanController {
  private readonly planTrip: PlanTrip;

  constructor() {
    // Wired manually (no Nest providers) to keep the layering obvious:
    // http -> application -> ports -> adapters.
    this.planTrip = new PlanTrip(new OtpPlanner(new OtpClient()));
  }

  @Get('plan')
  async plan(@Query() q: PlanQueryDto): Promise<Itinerary[]> {
    try {
      return await this.planTrip.execute({
        from: { lat: q.fromLat, lon: q.fromLon },
        to: { lat: q.toLat, lon: q.toLon },
        when: q.when ? new Date(q.when) : undefined,
        arriveBy: q.arriveBy,
        modes: q.modes,
        lang: q.lang,
      });
    } catch (err) {
      const coded = err as { code?: string; status?: number; message?: string };
      if (coded?.code === 'OUT_OF_AREA') {
        throw ApiException.badRequest(coded.code, coded.message ?? 'Out of area');
      }
      throw ApiException.upstream(
        'Trip planner is unavailable. Please try again.',
      );
    }
  }
}
