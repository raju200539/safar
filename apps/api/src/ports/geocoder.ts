import type { Place } from '@hyd/shared';

export interface Geocoder {
  search(q: string, limit: number): Promise<Place[]>;
}

export interface NominatimResult {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  class?: string;
  importance?: number;
}

/** Pure mapping: Nominatim JSON -> Place. Unit-tested with fixtures. */
export function mapNominatimResults(items: NominatimResult[]): Place[] {
  const out: Place[] = [];
  for (const item of items ?? []) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!item.display_name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    // Short label: first two address parts ("Charminar, Hyderabad").
    const short = item.display_name
      .split(',')
      .slice(0, 2)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
    out.push({ name: short || item.display_name, lat, lon, kind: 'place' });
  }
  return out;
}
