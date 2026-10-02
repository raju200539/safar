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

const BUS_MODES = [{ mode: 'BUS' }, { mode: 'COACH' }];
const METRO_MODES = [
  { mode: 'SUBWAY' },
  { mode: 'RAIL' },
  { mode: 'TRAM' },
];
const ALL_MODES = [...BUS_MODES, ...METRO_MODES];

function toOtpDateTime(when: Date, arriveBy: boolean): Record<string, string> {
  // OffsetDateTime with the Hyderabad offset so OTP picks the right day.
  const ist = new Date(when.getTime() + 5.5 * 3600 * 1000);
  const iso = ist.toISOString().slice(0, 19) + '+05:30';
  return arriveBy ? { latestArrival: iso } : { earliestDeparture: iso };
}

export class OtpPlanner implements TripPlanner {
  constructor(private readonly client: OtpClient = new OtpClient()) {}

  /**
   * One search per requested family so the rider gets genuinely different
   * ways to go, not the same trip thrice. PlanTrip dedupes + ranks.
   */
  async plan(q: PlanQuery): Promise<Itinerary[]> {
    const when = q.when ?? new Date();
    const arriveBy = q.arriveBy ?? false;
    const base = {
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
      first: PLANNER_REQUEST_COUNT,
    };
    const family = q.modes ?? 'all';
    const searches =
      family === 'bus'
        ? [{ ...base, modes: { transit: { transit: BUS_MODES } } }]
        : family === 'metro'
          ? [{ ...base, modes: { transit: { transit: METRO_MODES } } }]
          : [
              { ...base, modes: { transit: { transit: ALL_MODES } } },
              { ...base, modes: { transit: { transit: BUS_MODES } } },
              { ...base, modes: { transit: { transit: METRO_MODES } } },
            ];
    const results = await Promise.all(
      searches.map((variables) => this.search(variables)),
    );
    const merged = results.flat();
    return merged.slice(0, MAX_ITINERARIES * 2);
  }

  private async search(variables: unknown): Promise<Itinerary[]> {
    let data: {
      planConnection?: {
        edges?: Array<{ node?: OtpItinerary | null } | null> | null;
      } | null;
    };
    try {
      data = await this.client.query<{
        planConnection?: {
          edges?: Array<{ node?: OtpItinerary | null } | null> | null;
        } | null;
      }>(PLAN_QUERY, variables);
    } catch {
      return [];
    }
    const edges = data.planConnection?.edges ?? [];
    const mapped: Itinerary[] = [];
    edges.forEach((e, i) => {
      if (!e?.node) return;
      const m = mapItinerary(e.node, i);
      if (m) mapped.push(m);
    });
    return mapped;
  }
}
