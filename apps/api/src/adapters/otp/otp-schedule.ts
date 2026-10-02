import type { Arrival, Place } from '@hyd/shared';
import type {
  TransitSchedule,
} from '../../ports/transit-schedule';
import { OtpClient } from './otp-client';
import {
  STOPS_BY_NAME_QUERY,
  STOPS_BY_RADIUS_QUERY,
  STOP_DEPARTURES_QUERY,
} from './gtfs-queries';
import {
  dedupePlaces,
  mapDepartures,
  mapStop,
  type OtpStopNode,
  type OtpStoptime,
} from './mappers';

const MAX_RADIUS_M = 2000;
const MAX_LIMIT = 50;

export class OtpSchedule implements TransitSchedule {
  constructor(private readonly client: OtpClient = new OtpClient()) {}

  async searchStops(q: string, limit: number): Promise<Place[]> {
    const data = await this.client.query<{ stops?: OtpStopNode[] | null }>(
      STOPS_BY_NAME_QUERY,
      { name: q },
    );
    const out: Place[] = [];
    for (const s of (data.stops ?? []).slice(0, Math.min(limit, MAX_LIMIT))) {
      const p = mapStop(s);
      if (p) out.push(p);
    }
    return dedupePlaces(out);
  }

  async nearbyStops(
    p: { lat: number; lon: number },
    radiusM: number,
  ): Promise<Place[]> {
    const radius = Math.max(
      50,
      Math.min(Math.round(radiusM) || 500, MAX_RADIUS_M),
    );
    const data = await this.client.query<{
      stopsByRadius?: {
        edges?: Array<{
          node?: { distance?: number; stop?: OtpStopNode | null } | null;
        } | null> | null;
      } | null;
    }>(STOPS_BY_RADIUS_QUERY, {
      lat: p.lat,
      lon: p.lon,
      radius,
      first: MAX_LIMIT,
    });
    const out: Place[] = [];
    for (const e of data.stopsByRadius?.edges ?? []) {
      const s = e?.node?.stop;
      if (!s) continue;
      const place = mapStop(s);
      if (place) out.push(place);
      if (out.length >= MAX_LIMIT) break;
    }
    return dedupePlaces(out);
  }

  async departures(stopId: string, limit: number): Promise<Arrival[]> {
    const data = await this.client.query<{
      stop?: { stoptimesWithoutPatterns?: OtpStoptime[] | null } | null;
    }>(STOP_DEPARTURES_QUERY, {
      id: stopId,
      n: Math.max(1, Math.min(limit, MAX_LIMIT)),
    });
    return mapDepartures(data.stop?.stoptimesWithoutPatterns ?? []);
  }
}
