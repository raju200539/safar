import type { Arrival, LatLon, Place } from '@hyd/shared';

export interface TransitSchedule {
  searchStops(q: string, limit: number): Promise<Place[]>;
  nearbyStops(p: LatLon, radiusM: number): Promise<Place[]>;
  departures(stopId: string, limit: number): Promise<Arrival[]>;
}
