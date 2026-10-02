import type { Itinerary } from '@hyd/shared';

// Trip results are too large for URL params (a full itinerary is ~14 KB
// and can get truncated). Results store them here; detail reads by id.
const store = new Map<string, Itinerary>();
const searches = new Map<string, Itinerary[]>();

export function putItinerary(it: Itinerary): string {
  store.set(it.id, it);
  if (store.size > 20) {
    const first = store.keys().next();
    if (!first.done) store.delete(first.value);
  }
  return it.id;
}

export function getItinerary(id: string): Itinerary | null {
  return store.get(id) ?? null;
}

/** Last search per query key so Back returns instantly to the same list. */
export function putSearch(key: string, items: Itinerary[]): void {
  for (const it of items) store.set(it.id, it);
  searches.set(key, items);
}

export function getSearch(key: string): Itinerary[] | null {
  return searches.get(key) ?? null;
}

export interface SearchParams {
  fromName: string;
  fromLat: string;
  fromLon: string;
  toName: string;
  toLat: string;
  toLon: string;
  when?: string;
}

let lastParams: SearchParams | null = null;

/** Remembered on every results search so Trip-back always has somewhere to go. */
export function putLastSearch(p: SearchParams): void {
  lastParams = p;
}

export function getLastSearch(): SearchParams | null {
  return lastParams;
}
