import type { TripPlanner } from '../../ports/trip-planner';
import type { PlanQuery } from '../../application/plan-trip';
import {
  MAX_ITINERARIES,
  PLANNER_REQUEST_COUNT,
} from '../../application/plan-trip';
import { OtpClient } from './otp-client';
import { PLAN_QUERY } from './gtfs-queries';
import { mapItinerary, type OtpItinerary } from './mappers';
import type { Itinerary } from '@hyd/shared';

const TRANSIT_MODES = ['BUS', 'COACH', 'SUBWAY', 'RAIL', 'TRAM'].map(
  (mode) => ({ mode }),
);

function toOtpDateTime(when: Date, arriveBy: boolean): Record<string, string> {
  // OffsetDateTime with the Hyderabad offset so OTP picks the right day.
  const ist = new Date(when.getTime() + 5.5 * 3600 * 1000);
  const iso = ist.toISOString().slice(0, 19) + '+05:30';
  return arriveBy ? { latestArrival: iso } : { earliestDeparture: iso };
}

export class OtpPlanner implements TripPlanner {
  constructor(private readonly client: OtpClient = new OtpClient()) {}

  async plan(q: PlanQuery): Promise<Itinerary[]> {
    const when = q.when ?? new Date();
    const arriveBy = q.arriveBy ?? false;
    const data = await this.client.query<{
      planConnection?: {
        edges?: Array<{ node?: OtpItinerary | null } | null> | null;
      } | null;
    }>(PLAN_QUERY, {
      origin: {
        location: {
          coordinate: { latitude: q.from.lat, longitude: q.from.lon },
        },
      },
      destination: {
        location: {
          coordinate: { latitude: q.to.lat, longitude: q.to.lon },
        },
      },
      dateTime: toOtpDateTime(when, arriveBy),
      modes: { transit: { transit: TRANSIT_MODES } },
      first: PLANNER_REQUEST_COUNT,
    });
    const edges = data.planConnection?.edges ?? [];
    const mapped: Itinerary[] = [];
    edges.forEach((e, i) => {
      if (!e?.node) return;
      const m = mapItinerary(e.node, i);
      if (m) mapped.push(m);
    });
    return mapped.slice(0, MAX_ITINERARIES);
  }
}
