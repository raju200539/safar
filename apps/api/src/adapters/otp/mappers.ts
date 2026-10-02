import type {
  Arrival,
  Itinerary,
  Leg,
  Mode,
  Place,
} from '@hyd/shared';
import { buildInstruction } from '../../application/instructions';

// Raw OTP GTFS-GraphQL shapes (subset we query). Kept loose on purpose:
// OTP versions drift; mappers validate at runtime and skip what they
// cannot understand rather than crashing the request.

export interface OtpStopRef {
  gtfsId?: string | null;
  code?: string | null;
  name?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface OtpPlace {
  name?: string | null;
  lat?: number | null;
  lon?: number | null;
  stop?: OtpStopRef | null;
}

export interface OtpLegTime {
  scheduledTime?: string | number | null;
}

export interface OtpStopCall {
  stopLocation?: OtpStopRef | null;
}

export interface OtpLeg {
  mode?: string | null;
  start?: OtpLegTime | null;
  end?: OtpLegTime | null;
  duration?: number | null;
  distance?: number | null;
  headsign?: string | null;
  from?: OtpPlace | null;
  to?: OtpPlace | null;
  route?: {
    gtfsId?: string | null;
    shortName?: string | null;
    longName?: string | null;
    agency?: { name?: string | null } | null;
  } | null;
  trip?: {
    gtfsId?: string | null;
    tripHeadsign?: string | null;
    tripShortName?: string | null;
  } | null;
  stopCalls?: OtpStopCall[] | null;
  /** Legacy field (pre-2.10 schema); supported for tests/fixtures. */
  intermediateStops?: OtpStopRef[] | null;
  legGeometry?: { points?: string | null } | null;
}

export interface OtpItinerary {
  start?: string | number | null;
  end?: string | number | null;
  duration?: number | null;
  walkDistance?: number | null;
  numberOfTransfers?: number | null;
  /** Legacy field (pre-2.10 schema). */
  transfers?: number | null;
  legs?: OtpLeg[] | null;
}

const OTP_TO_MODE: Record<string, Mode> = {
  WALK: 'WALK',
  BUS: 'BUS',
  COACH: 'BUS',
  TROLLEYBUS: 'BUS',
  SUBWAY: 'METRO',
  RAIL: 'METRO',
  TRAM: 'METRO',
  MONORAIL: 'METRO',
};

export function mapMode(otpMode: string | null | undefined): Mode | null {
  if (!otpMode) return null;
  return OTP_TO_MODE[otpMode.toUpperCase()] ?? null;
}

/** OTP times arrive as ISO strings, epoch millis, or epoch seconds. */
export function toISO(
  value: string | number | null | undefined,
  serviceDaySec?: number | null,
): string {
  if (value == null) return new Date(0).toISOString();
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    const n = Number(value);
    if (Number.isFinite(n)) return toISO(n, serviceDaySec);
    return new Date(0).toISOString();
  }
  if (serviceDaySec != null && value < 200000) {
    // Seconds since midnight of the service day (stoptime shape).
    return new Date((serviceDaySec + value) * 1000).toISOString();
  }
  const ms = value < 1e12 ? value * 1000 : value;
  return new Date(ms).toISOString();
}

function toPlace(p: OtpPlace | null | undefined, fallback: string): Place {
  const stop = p?.stop;
  return {
    name: stop?.name ?? p?.name ?? fallback,
    lat: Number(stop?.lat ?? p?.lat ?? 0),
    lon: Number(stop?.lon ?? p?.lon ?? 0),
    stopId: stop?.gtfsId ?? undefined,
  };
}

function toIntermediate(stop: OtpStopRef): Place {
  return {
    name: stop.name ?? stop.code ?? 'Stop',
    lat: Number(stop.lat ?? 0),
    lon: Number(stop.lon ?? 0),
    stopId: stop.gtfsId ?? undefined,
  };
}

const METRO_LINES: Record<string, string> = {
  RED: 'Red Line',
  GREEN: 'Green Line',
  BLUE: 'Blue Line',
};

function metroLineName(
  gtfsId: string | null | undefined,
  shortName: string | null | undefined,
): string | null {
  const tail = (gtfsId ?? '').split(':').pop()?.toUpperCase() ?? '';
  if (tail && METRO_LINES[tail]) return METRO_LINES[tail];
  const upper = (shortName ?? '').toUpperCase();
  for (const [code, name] of Object.entries(METRO_LINES)) {
    if (upper.includes(code)) return name;
  }
  return null;
}

/**
 * TGSRTC tripShortNames repeat the route ("17H/219I_CHERLAPALLY_..._ISNAPUR").
 * Strip the echoed route prefix and underscoring for spoken instructions.
 */
export function cleanHeadsign(raw: string, shortName?: string): string {
  let s = raw.trim();
  if (shortName) {
    const prefix = shortName.trim();
    if (s.toUpperCase().startsWith(prefix.toUpperCase())) {
      s = s.slice(prefix.length).replace(/^[-_\s]+/, '');
    }
  }
  s = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return s || raw;
}

function shortNameOf(leg: OtpLeg): string {
  if (leg.route?.shortName) {
    // HMRL shortNames are codes ("C1_RED"): show "Red Line" instead.
    const metro = metroLineName(leg.route.gtfsId, leg.route.shortName);
    if (metro) return metro;
    return leg.route.shortName;
  }
  // TGSRTC GTFS has no route_short_name: fall back to the feed-scoped id
  // ("tgsrtc:219" -> "219") so riders still see a bus number.
  const gtfsId = leg.route?.gtfsId ?? leg.trip?.gtfsId ?? '';
  const tail = gtfsId.split(':').pop() ?? '';
  if (tail) return tail;
  return leg.route?.longName ?? 'bus';
}

export function mapLeg(leg: OtpLeg): Leg | null {
  const mode = mapMode(leg.mode);
  if (!mode) return null;
  const from = toPlace(leg.from, 'Start');
  const to = toPlace(leg.to, 'Destination');
  const calls = (leg.stopCalls ?? [])
    .map((c) => c.stopLocation)
    .filter((s): s is OtpStopRef => s != null);
  // stopCalls include the board + alight stops: travelled = calls - 1,
  // and only the in-between stops are "intermediate".
  const legacy = leg.intermediateStops ?? [];
  const between = calls.length > 0 ? calls.slice(1, -1) : legacy;
  const intermediateStops = between.map(toIntermediate);

  const mapped: Leg = {
    mode,
    from,
    to,
    startTime: toISO(leg.start?.scheduledTime),
    endTime: toISO(leg.end?.scheduledTime),
    durationSec: Math.round(Number(leg.duration ?? 0)),
    geometry: leg.legGeometry?.points ?? '',
    instruction: '',
  };
  if (leg.distance != null) mapped.distanceM = Math.round(Number(leg.distance));
  if (mode !== 'WALK') {
    mapped.route = {
      id: leg.route?.gtfsId ?? shortNameOf(leg),
      shortName: shortNameOf(leg),
      longName: leg.route?.longName ?? undefined,
      agency: leg.route?.agency?.name ?? '',
    };
    const rawHeadsign =
      leg.headsign ?? leg.trip?.tripHeadsign ?? leg.trip?.tripShortName;
    if (rawHeadsign) mapped.headsign = cleanHeadsign(rawHeadsign, mapped.route?.shortName);
    // stopCalls include board + alight: travelled = calls - 1.
    mapped.stopCount =
      calls.length > 0
        ? Math.max(0, calls.length - 1)
        : intermediateStops.length + 1;
    if (intermediateStops.length > 0) {
      mapped.intermediateStops = intermediateStops;
    }
  }
  mapped.instruction = buildInstruction(mapped);
  return mapped;
}

export function mapItinerary(it: OtpItinerary, index: number): Itinerary | null {
  const legs: Leg[] = [];
  for (const raw of it.legs ?? []) {
    const leg = mapLeg(raw);
    if (!leg) return null; // unknown mode: drop the whole option
    legs.push(leg);
  }
  if (legs.length === 0) return null;
  const transitLegs = legs.filter((l) => l.mode !== 'WALK').length;
  return {
    id: `it-${String(it.start ?? index)}-${index}`,
    startTime: toISO(it.start),
    endTime: toISO(it.end),
    durationSec: Math.round(Number(it.duration ?? 0)),
    transfers:
      it.numberOfTransfers ?? it.transfers ?? Math.max(0, transitLegs - 1),
    walkDistanceM: Math.round(Number(it.walkDistance ?? 0)),
    legs,
  };
}

// --- Stops / departures mapping (M3) ---

export interface OtpStopNode {
  gtfsId?: string | null;
  code?: string | null;
  name?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export function mapStop(s: OtpStopNode): Place | null {
  if (!s.gtfsId || s.lat == null || s.lon == null) return null;
  return {
    name: s.name ?? s.code ?? 'Stop',
    lat: Number(s.lat),
    lon: Number(s.lon),
    stopId: s.gtfsId,
  };
}

/**
 * The feed has one stop per direction, so "Koti" matches 2+ rows.
 * Group by normalized name, merging stops within a short walk of each
 * other, so each place appears once in search/nearby results.
 */
export function dedupePlaces(places: Place[], mergeRadiusM = 200): Place[] {
  const out: Place[] = [];
  for (const p of places) {
    const key = p.name.trim().toLowerCase();
    const existing = out.find(
      (q) =>
        q.name.trim().toLowerCase() === key &&
        haversineM(q.lat, q.lon, p.lat, p.lon) <= mergeRadiusM,
    );
    if (!existing) {
      out.push(p);
      continue;
    }
    // Keep the first stopId (stable); nothing else to merge for v1.
  }
  return out;
}

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const r = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export interface OtpStoptime {
  serviceDay?: number | null;
  scheduledArrival?: string | number | null;
  realtimeArrival?: string | number | null;
  realtime?: boolean | null;
  headsign?: string | null;
  trip?: {
    tripHeadsign?: string | null;
    route?: { shortName?: string | null; longName?: string | null } | null;
  } | null;
}

export function mapDepartures(times: OtpStoptime[]): Arrival[] {
  const out: Arrival[] = [];
  for (const t of times ?? []) {
    const shortName =
      t.trip?.route?.shortName ?? t.trip?.route?.longName ?? '—';
    const live = Boolean(t.realtime) && t.realtimeArrival != null;
    const arrival: Arrival = {
      routeShortName: shortName,
      headsign: t.headsign ?? t.trip?.tripHeadsign ?? '',
      scheduledTime: toISO(t.scheduledArrival, t.serviceDay),
      source: live ? 'live' : 'scheduled',
    };
    if (live) {
      arrival.liveTime = toISO(t.realtimeArrival, t.serviceDay);
    }
    out.push(arrival);
  }
  return out;
}
