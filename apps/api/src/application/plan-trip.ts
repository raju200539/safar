import type { Itinerary, LatLon, Leg } from '@hyd/shared';
import type { TripPlanner } from '../ports/trip-planner';

export interface PlanQuery {
  from: LatLon;
  to: LatLon;
  when?: Date;
  arriveBy?: boolean;
}

export const MAX_ITINERARIES = 3;

/** OTP is asked for more than we show so ranking has material to choose from. */
export const PLANNER_REQUEST_COUNT = 6;

/** Walk legs longer than this make an option a last resort. */
const MAX_SINGLE_WALK_M = 2000;
const MAX_TOTAL_WALK_M = 3000;

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

/** M2: PlanTrip use case — validate, rank, return up to 3 distinct options. */
export class PlanTrip {
  constructor(private readonly planner: TripPlanner) {}

  async execute(q: PlanQuery): Promise<Itinerary[]> {
    assertInHyderabad(q.from, 'Origin');
    assertInHyderabad(q.to, 'Destination');
    const out = await this.planner.plan(q);
    return rankItineraries(out).slice(0, MAX_ITINERARIES);
  }
}

/** Signature of the transit part: same buses/trains, same stops = duplicate. */
export function itinerarySignature(it: Itinerary): string {
  return it.legs
    .filter((l) => l.mode !== 'WALK')
    .map(
      (l) =>
        `${l.mode}:${l.route?.id ?? '?'}@${l.from.stopId ?? l.from.name}>${l.to.stopId ?? l.to.name}`,
    )
    .join('|');
}

function walkOf(it: Itinerary): { total: number; maxLeg: number } {
  const walks = it.legs
    .filter((l: Leg) => l.mode === 'WALK')
    .map((l: Leg) => l.distanceM ?? 0);
  return {
    total: walks.reduce((a, b) => a + b, 0),
    maxLeg: walks.length > 0 ? Math.max(...walks) : 0,
  };
}

function hasAbsurdWalk(it: Itinerary): boolean {
  const w = walkOf(it);
  return w.maxLeg > MAX_SINGLE_WALK_M || w.total > MAX_TOTAL_WALK_M;
}

/**
 * OTP returns near-duplicates (same route, minutes apart). Keep the earliest
 * of each distinct signature, drop absurd walks unless nothing else exists.
 * Output is sorted by departure (arrival-time order).
 */
export function rankItineraries(input: Itinerary[]): Itinerary[] {
  const sorted = [...input].sort((a, b) =>
    a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0,
  );
  const seen = new Set<string>();
  const distinct: Itinerary[] = [];
  for (const it of sorted) {
    const sig = itinerarySignature(it) || `walk-${it.id}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    distinct.push(it);
  }
  if (distinct.length === 0) return [];
  const sane = distinct.filter((it) => !hasAbsurdWalk(it));
  return sane.length > 0 ? sane : distinct.slice(0, 1);
}
