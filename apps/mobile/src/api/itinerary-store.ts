import type { Itinerary } from '@hyd/shared';

// Trip results are too large for URL params (a full itinerary is ~14 KB
// and can get truncated). Results store them here; detail reads by id.
const store = new Map<string, Itinerary>();

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
