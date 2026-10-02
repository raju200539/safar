import * as fs from 'node:fs';
import * as path from 'node:path';
import AdmZip from 'adm-zip';

// HMRL metro fares come straight from the feed's fare tables
// (fare_attributes.txt + fare_rules.txt keyed by station zone_id).
// TGSRTC publishes no fare files, so bus legs carry no fare —
// we never invent prices.

interface FareTables {
  priceById: Map<string, number>;
  fareByOd: Map<string, string>;
  zoneByStop: Map<string, string>;
}

let loaded: FareTables | null | undefined;

function csv(text: string): string[][] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(',').map((c) => c.trim()));
}

function gtfsPath(): string | null {
  const candidates = [
    process.env.HMRL_GTFS_PATH,
    // API run from apps/api (dev, tests, dist).
    path.join(process.cwd(), '..', '..', 'data', 'gtfs', 'hmrl.zip'),
    // API run from the repo root.
    path.join(process.cwd(), 'data', 'gtfs', 'hmrl.zip'),
  ].filter((c): c is string => c != null && c.length > 0);
  return candidates.find((c) => fs.existsSync(c)) ?? null;
}

export function loadHmrlFares(): FareTables | null {
  if (loaded !== undefined) return loaded;
  try {
    const file = gtfsPath();
    if (!file) {
      loaded = null;
      return loaded;
    }
    const zip = new AdmZip(file);
    const read = (name: string): string[][] => {
      const entry = zip.getEntry(name);
      if (!entry) return [];
      return csv(zip.readAsText(entry)).slice(1);
    };
    const priceById = new Map<string, number>();
    for (const [fareId, price] of read('fare_attributes.txt').map((r) => [r[0], r[1]])) {
      const n = Number(price);
      if (fareId && Number.isFinite(n)) priceById.set(fareId, n);
    }
    const fareByOd = new Map<string, string>();
    for (const row of read('fare_rules.txt')) {
      if (row[0] && row[1] && row[2]) fareByOd.set(`${row[0]}>${row[1]}`, row[2]);
    }
    const zoneByStop = new Map<string, string>();
    for (const row of read('stops.txt')) {
      // stop_id,stop_name,stop_lat,stop_lon,zone_id,...
      if (row[0] && row[4]) zoneByStop.set(row[0], row[4]);
    }
    loaded = { priceById, fareByOd, zoneByStop };
  } catch {
    loaded = null;
  }
  return loaded;
}

/** Test-only reset. */
export function resetFares(): void {
  loaded = undefined;
}

function feedLocalId(gtfsId: string | undefined): string | null {
  if (!gtfsId || !gtfsId.startsWith('hmrl:')) return null;
  return gtfsId.slice('hmrl:'.length);
}

/** Exact metro fare in INR, or null when unknown. */
export function metroFareInr(fromGtfsId?: string, toGtfsId?: string): number | null {
  const tables = loadHmrlFares();
  const from = feedLocalId(fromGtfsId);
  const to = feedLocalId(toGtfsId);
  if (!tables || !from || !to) return null;
  const fromZone = tables.zoneByStop.get(from);
  const toZone = tables.zoneByStop.get(to);
  if (!fromZone || !toZone) return null;
  const fareId = tables.fareByOd.get(`${fromZone}>${toZone}`);
  if (!fareId) return null;
  return tables.priceById.get(fareId) ?? null;
}
