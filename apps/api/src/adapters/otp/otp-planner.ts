import type { TripPlanner } from '../../ports/trip-planner';
import type { PlanQuery } from '../../application/plan-trip';
import {
  PLANNER_REQUEST_COUNT,
} from '../../application/plan-trip';
import { OtpClient } from './otp-client';
import { PLAN_QUERY, STOPS_BY_RADIUS_QUERY } from './gtfs-queries';
import {
  mapItinerary,
  mapStop,
  type OtpItinerary,
  type OtpStopNode,
} from './mappers';
import type { Itinerary, LatLon } from '@hyd/shared';

const BUS_MODES = [{ mode: 'BUS' }, { mode: 'COACH' }];
const METRO_MODES = [
  { mode: 'SUBWAY' },
  { mode: 'RAIL' },
  { mode: 'TRAM' },
];
const ALL_MODES = [...BUS_MODES, ...METRO_MODES];

/** How far to look for a metro station to route via (metres). */
const HUB_SEARCH_RADIUS_M = 8000;
/** Must be large: the nearest stops are all buses; metro is further out. */
const HUB_LIMIT = 50;

function toOtpDateTime(when: Date, arriveBy: boolean): Record<string, string> {
  // OffsetDateTime with the Hyderabad offset so OTP picks the right day.
  const ist = new Date(when.getTime() + 5.5 * 3600 * 1000);
  const iso = ist.toISOString().slice(0, 19) + '+05:30';
  return arriveBy ? { latestArrival: iso } : { earliestDeparture: iso };
}

interface BaseVars {
  origin: unknown;
  destination: unknown;
  dateTime: unknown;
  first: number;
}

export class OtpPlanner implements TripPlanner {
  constructor(private readonly client: OtpClient = new OtpClient()) {}

  /**
   * One search per requested family so the rider gets genuinely different
   * ways to go, not the same trip thrice. When no METRO leg survives and
   * the rider didn't ask for buses only, retry through the nearest metro
   * stations so bus→metro→… combos still surface. PlanTrip dedupes + ranks.
   */
  async plan(q: PlanQuery): Promise<Itinerary[]> {
    const when = q.when ?? new Date();
    const arriveBy = q.arriveBy ?? false;
    const base: BaseVars = {
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
    let merged = results.flat();
    if (family !== 'bus' && !merged.some((it) => hasMetro(it))) {
      const extra = await this.viaMetroHubs(base);
      merged = [...merged, ...extra];
    }
    // No truncation here: PlanTrip dedupes, filters and diversifies
    // the full set down to MAX_ITINERARIES.
    return merged;
  }

  /** Metro stations near origin/destination, nearest first. */
  private async metroHubs(p: LatLon): Promise<OtpStopNode[]> {
    let data: {
      stopsByRadius?: {
        edges?: Array<{
          node?: { distance?: number; stop?: OtpStopNode | null } | null;
        } | null> | null;
      } | null;
    };
    try {
      data = await this.client.query(STOPS_BY_RADIUS_QUERY, {
        lat: p.lat,
        lon: p.lon,
        radius: HUB_SEARCH_RADIUS_M,
        first: HUB_LIMIT,
      });
    } catch {
      return [];
    }
    const out: Array<{ stop: OtpStopNode; dist: number }> = [];
    for (const e of data.stopsByRadius?.edges ?? []) {
      const s = e?.node?.stop;
      if (!s || s.lat == null || s.lon == null) continue;
      if ((s.vehicleMode ?? '').toUpperCase() !== 'SUBWAY') continue;
      // Parent stations, not individual platforms.
      if (mapStop(s)?.stopId == null) continue;
      out.push({ stop: s, dist: Number(e?.node?.distance ?? 1e12) });
    }
    out.sort((a, b) => a.dist - b.dist);
    // De-dupe platforms of the same station by name.
    const seen = new Set<string>();
    return out
      .filter(({ stop }) => {
        const key = (stop.name ?? '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ stop }) => stop);
  }

  /**
   * Force journeys through the nearest metro stations so bus→metro combos
   * appear even when the pareto search prunes them.
   */
  private async viaMetroHubs(base: BaseVars): Promise<Itinerary[]> {
    const origin = (base.origin as { location: { coordinate: LatLon } }).location.coordinate;
    const destination = (base.destination as { location: { coordinate: LatLon } })
      .location.coordinate;
    const [nearOrigin, nearDest] = await Promise.all([
      this.metroHubs(origin),
      this.metroHubs(destination),
    ]);
    const hubs = [...nearOrigin.slice(0, 1), ...nearDest.slice(0, 1)];
    if (hubs.length === 0) return [];
    const results = await Promise.all(
      hubs.map((hub) =>
        this.search({
          ...base,
          modes: { transit: { transit: ALL_MODES } },
          via: [
            { visit: { coordinate: { latitude: hub.lat, longitude: hub.lon } } },
          ],
        }),
      ),
    );
    // Only keep journeys that actually use the metro.
    return results.flat().filter((it) => hasMetro(it));
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

function hasMetro(it: Itinerary): boolean {
  return it.legs.some((l) => l.mode === 'METRO');
}
