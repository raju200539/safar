import type { Itinerary, LatLon } from '@hyd/shared';

export interface TripPlanner {
  plan(q: {
    from: LatLon;
    to: LatLon;
    when?: Date;
    arriveBy?: boolean;
    modes?: 'all' | 'bus' | 'metro';
  }): Promise<Itinerary[]>;
}
