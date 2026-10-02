import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { PostgresStore } from '../adapters/postgres/postgres-store';
import { ApiException } from './api-exception';
import { reportRateLimit } from './rate-limit';
import { AlertsQueryDto, CreateReportDto } from './dto/report.dto';
import type { Report } from '@hyd/shared';

/** Last 6 hours, per SPEC §2.7. */
const ALERTS_WINDOW_MINUTES = 360;

@Controller('v1')
export class ReportsController {
  private readonly store = new PostgresStore();

  @Get('alerts')
  async alerts(@Query() q: AlertsQueryDto): Promise<Report[]> {
    try {
      return await this.store.recent({
        stopId: q.stopId,
        routeId: q.routeId,
        sinceMinutes: ALERTS_WINDOW_MINUTES,
      });
    } catch (err) {
      throw this.toApi(err, 'Alerts are unavailable.');
    }
  }

  @Post('reports')
  async create(
    @Body() body: CreateReportDto,
    @Headers('x-device-id') deviceId?: string,
  ): Promise<Report> {
    const id = (deviceId ?? '').trim().slice(0, 64);
    if (!id) {
      throw ApiException.badRequest(
        'MISSING_DEVICE_ID',
        'x-device-id header is required.',
      );
    }
    if (!reportRateLimit(id)) {
      throw new ApiException(
        429,
        'RATE_LIMITED',
        'Too many reports. Try again later.',
      );
    }
    try {
      return await this.store.add({
        type: body.type,
        routeId: body.routeId,
        stopId: body.stopId,
        note: body.note,
        deviceId: id,
      });
    } catch (err) {
      throw this.toApi(err, 'Could not save the report.');
    }
  }

  private toApi(err: unknown, fallback: string): ApiException {
    const coded = err as { code?: string; status?: number; message?: string };
    if (coded?.code === 'STORE_UNAVAILABLE') {
      return new ApiException(503, coded.code, coded.message ?? fallback);
    }
    return ApiException.upstream(fallback);
  }
}
