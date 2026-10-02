// Nominatim (OpenStreetMap) geocoder behind the Geocoder port.
// Usage-policy friendly: 1 req/s throttle, in-memory cache, Hyderabad
// viewbox + bounds, small limits. Never called from mobile directly.
import type { Place } from '@hyd/shared';
import type {
  Geocoder,
  NominatimResult,
} from '../../ports/geocoder';
import { mapNominatimResults } from '../../ports/geocoder';

const VIEWBOX = '78.1,17.7,78.7,17.15'; // left,top,right,bottom
const MIN_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 24 * 3600 * 1000;
const CACHE_MAX = 200;

const cache = new Map<string, { at: number; value: Place[] }>();
let lastCall = 0;
let queue: Promise<unknown> = Promise.resolve();

function cached(key: string): Place[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

/** Test-only reset. */
export function resetGeocoderCache(): void {
  cache.clear();
  lastCall = 0;
  queue = Promise.resolve();
}

export class NominatimGeocoder implements Geocoder {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string = process.env.GEOCODER_URL ?? 'https://nominatim.openstreetmap.org',
    private readonly timeoutMs = 8000,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async search(q: string, limit: number): Promise<Place[]> {
    const query = q.trim();
    if (query.length < 3) return [];
    const n = Math.max(1, Math.min(limit, 10));
    const key = `${query}|${n}`;
    const hit = cached(key);
    if (hit) return hit;
    // Serialize + throttle to respect the 1 req/s usage policy.
    const run = queue.then(async () => {
      const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const url =
        `${this.baseUrl}/search?format=jsonv2&limit=${n}` +
        `&countrycodes=in&viewbox=${VIEWBOX}&bounded=1` +
        `&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          // Nominatim requires a identifying User-Agent.
          'User-Agent': 'hyd-transit/0.1 (contact: hyd-transit-local)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      lastCall = Date.now();
      if (!res.ok) return [];
      const items = (await res.json()) as NominatimResult[];
      return mapNominatimResults(items).slice(0, n);
    });
    queue = run.catch(() => undefined);
    try {
      const value = await run;
      cache.set(key, { at: Date.now(), value });
      if (cache.size > CACHE_MAX) {
        const first = cache.keys().next();
        if (!first.done) cache.delete(first.value);
      }
      return value;
    } catch {
      return [];
    }
  }
}
