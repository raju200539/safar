// Shared domain types — plain types only, no framework imports.
// Mirrors docs/SPEC.md §2.5. Single source of truth for API + mobile.

export type Mode = 'WALK' | 'BUS' | 'METRO';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Place extends LatLon {
  name: string;
  stopId?: string;
  /** Straight-line distance from the query point, when known (nearby). */
  distanceM?: number;
}

export interface LegRoute {
  id: string;
  shortName: string;
  longName?: string;
  agency: string;
}

export interface Leg {
  mode: Mode;
  from: Place;
  to: Place;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  durationSec: number;
  distanceM?: number;
  route?: LegRoute;
  headsign?: string;
  stopCount?: number;
  intermediateStops?: Place[];
  geometry: string; // encoded polyline
  instruction: string; // generated server-side, plain language
  live?: { etaSec: number; source: 'live' }; // absent => scheduled
}

export interface Itinerary {
  id: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  transfers: number;
  walkDistanceM: number;
  legs: Leg[];
}

export type ArrivalSource = 'live' | 'scheduled';

export interface Arrival {
  routeShortName: string;
  headsign: string;
  scheduledTime: string; // ISO 8601
  liveTime?: string; // ISO 8601
  source: ArrivalSource;
}

export type ReportType = 'NOT_RUNNING' | 'DIVERTED' | 'OVERCROWDED' | 'OTHER';

export interface Report {
  id: string;
  type: ReportType;
  routeId?: string;
  stopId?: string;
  note?: string;
  createdAt: string; // ISO 8601
}

export interface NewReport {
  type: ReportType;
  routeId?: string;
  stopId?: string;
  note?: string;
  deviceId: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  api: 'ok';
  otp: 'ok' | 'unreachable';
  db: 'ok' | 'unreachable';
  live: 'enabled' | 'disabled';
}
