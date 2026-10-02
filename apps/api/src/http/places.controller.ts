import { Controller, Get, Query } from '@nestjs/common';
import { OtpClient } from '../adapters/otp/otp-client';
import { OtpSchedule } from '../adapters/otp/otp-schedule';
import { NominatimGeocoder } from '../adapters/geocoder/nominatim-geocoder';
import { ApiException } from './api-exception';
import type { Place } from '@hyd/shared';

/** Combined stop + landmark search so riders can type houses/places. */
@Controller('v1/places')
export class PlacesController {
  private readonly schedule = new OtpSchedule(new OtpClient());
  private readonly geocoder = new NominatimGeocoder();

  @Get('search')
  async search(@Query('q') q?: string): Promise<Place[]> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      throw ApiException.badRequest(
        'INVALID_QUERY',
        'Search needs at least 2 characters.',
      );
    }
    try {
      const [stops, places] = await Promise.all([
        this.schedule.searchStops(query, 6).catch((): Place[] => []),
        this.geocoder.search(query, 5).catch((): Place[] => []),
      ]);
      const seen = new Set<string>();
      const out: Place[] = [];
      for (const p of [...stops, ...places]) {
        const key = `${p.kind ?? 'stop'}|${p.name.toLowerCase()}|${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...p, kind: p.kind ?? 'stop' });
        if (out.length >= 10) break;
      }
      return out;
    } catch {
      throw ApiException.upstream('Place search is unavailable.');
    }
  }
}
