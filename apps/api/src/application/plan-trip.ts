import type { Itinerary, LatLon } from '@hyd/shared';
import type { TripPlanner } from '../ports/trip-planner';

export interface PlanQuery {
  from: LatLon;
  to: LatLon;
  when?: Date;
  arriveBy?: boolean;
}

export const MAX_ITINERARIES = 3;

/** Hyderabad service area (OSM extract bbox + margin). SPEC §2.7. */
export const HYDERABAD_BBOX = {
  minLat: 17.15,
  maxLat: 17.7,
  minLon: 78.1,
  maxLon: 78.7,
};

export function assertInHyderabad(p: LatLon, label: string): void {
  const { minLat, maxLat, minLon, maxLon } = HYDERABAD_BBOX;
  if (
    !Number.isFinite(p.lat) ||
    !Number.isFinite(p.lon) ||
    p.lat < minLat ||
    p.lat > maxLat ||
    p.lon < minLon ||
    p.lon > maxLon
  ) {
    const err = new Error(
      `${label} is outside the Hyderabad service area`,
    ) as Error & { code?: string; status?: number };
    err.code = 'OUT_OF_AREA';
    err.status = 400;
    throw err;
  }
}

/** M2: PlanTrip use case — validate, delegate to TripPlanner, cap at 3. */
export class PlanTrip {
  constructor(private readonly planner: TripPlanner) {}

  async execute(q: PlanQuery): Promise<Itinerary[]> {
    assertInHyderabad(q.from, 'Origin');
    assertInHyderabad(q.to, 'Destination');
    const out = await this.planner.plan(q);
    return out.slice(0, MAX_ITINERARIES);
  }
}
