import { Controller, Get, Param, Query } from '@nestjs/common';
import { OtpClient } from '../adapters/otp/otp-client';
import { OtpSchedule } from '../adapters/otp/otp-schedule';
import { ApiException } from './api-exception';
import type { Arrival, Place } from '@hyd/shared';

@Controller('v1/stops')
export class StopsController {
  private readonly schedule = new OtpSchedule(new OtpClient());

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('limit') limit = '10',
  ): Promise<Place[]> {
    if (!q || q.trim().length < 2) {
      throw ApiException.badRequest(
        'INVALID_QUERY',
        'Search needs at least 2 characters.',
      );
    }
    try {
      return await this.schedule.searchStops(q.trim(), Number(limit) || 10);
    } catch {
      throw ApiException.upstream('Stop search is unavailable.');
    }
  }

  @Get('nearby')
  async nearby(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('radius') radius = '500',
  ): Promise<Place[]> {
    const la = Number(lat);
    const lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      throw ApiException.badRequest(
        'INVALID_COORDS',
        'lat and lon are required.',
      );
    }
    try {
      return await this.schedule.nearbyStops(
        { lat: la, lon: lo },
        Number(radius) || 500,
      );
    } catch {
      throw ApiException.upstream('Nearby stops are unavailable.');
    }
  }

  @Get(':id/arrivals')
  async arrivals(
    @Param('id') id: string,
    @Query('limit') limit = '10',
  ): Promise<Arrival[]> {
    try {
      return await this.schedule.departures(id, Number(limit) || 10);
    } catch {
      throw ApiException.upstream('Departures are unavailable.');
    }
  }
}
