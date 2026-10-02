import type { Place } from '@hyd/shared';

export interface Geocoder {
  search(q: string, limit: number): Promise<Place[]>;
}
