import type { Itinerary } from '@hyd/shared';
import {
  itinerarySignature,
  rankItineraries,
} from './plan-trip';

function leg(
  mode: 'WALK' | 'BUS' | 'METRO',
  extra: Partial<import('@hyd/shared').Leg> = {},
): import('@hyd/shared').Leg {
  return {
    mode,
    from: { name: 'A', lat: 0, lon: 0 },
    to: { name: 'B', lat: 0, lon: 0 },
    startTime: '2026-10-05T10:00:00+05:30',
    endTime: '2026-10-05T10:10:00+05:30',
    durationSec: 600,
    geometry: '',
    instruction: '',
    ...extra,
  } as import('@hyd/shared').Leg;
}

function itin(id: string, legs: import('@hyd/shared').Leg[]): Itinerary {
  const walkDistanceM = legs
    .filter((l) => l.mode === 'WALK')
    .reduce((a, l) => a + (l.distanceM ?? 0), 0);
  return {
    id,
    startTime: '2026-10-05T10:00:00+05:30',
    endTime: '2026-10-05T10:30:00+05:30',
    durationSec: 1800,
    transfers: 0,
    walkDistanceM,
    legs,
  };
}

const bus = (routeId: string, from = 'Koti', to = 'Dil'): import('@hyd/shared').Leg =>
  leg('BUS', {
    from: { name: from, lat: 0, lon: 0, stopId: `tgsrtc:${from}` },
    to: { name: to, lat: 0, lon: 0, stopId: `tgsrtc:${to}` },
    route: { id: routeId, shortName: routeId, agency: 'TGSRTC' },
  });

const walk = (m: number): import('@hyd/shared').Leg =>
  leg('WALK', { distanceM: m });

describe('rankItineraries', () => {
  it('drops exact duplicates, keeping the earliest', () => {
    const a = itin('a', [walk(200), bus('tgsrtc:218')]);
    const b = itin('b', [walk(200), bus('tgsrtc:218')]);
    const out = rankItineraries([a, b]);
    expect(out.map((i) => i.id)).toEqual(['a']);
  });

  it('keeps distinct routes', () => {
    const a = itin('a', [bus('tgsrtc:218')]);
    const b = itin('b', [bus('tgsrtc:219')]);
    expect(rankItineraries([a, b]).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('drops absurd walks when a sane option exists', () => {
    const bad = itin('bad', [walk(2500), bus('tgsrtc:218')]);
    const good = itin('good', [walk(300), bus('tgsrtc:218', 'X', 'Y')]);
    expect(rankItineraries([bad, good]).map((i) => i.id)).toEqual(['good']);
  });

  it('drops walk-only options unless the hop is short', () => {
    const hike = itin('hike', [walk(5000)]);
    expect(rankItineraries([hike])).toEqual([]);
    const stroll = itin('stroll', [walk(800)]);
    expect(rankItineraries([stroll]).map((i) => i.id)).toEqual(['stroll']);
  });

  it('keeps an absurd transit walk when it is the only option', () => {
    const bad = itin('bad', [walk(2500), bus('tgsrtc:218')]);
    expect(rankItineraries([bad]).map((i) => i.id)).toEqual(['bad']);
  });

  it('signature ignores walk legs', () => {
    const a = itin('a', [walk(100), bus('tgsrtc:218'), walk(100)]);
    const b = itin('b', [walk(900), bus('tgsrtc:218'), walk(50)]);
    expect(itinerarySignature(a)).toBe(itinerarySignature(b));
  });

  it('prefers options that use different routes', () => {
    const a = itin('a', [bus('tgsrtc:218')]);
    const b = itin('b', [bus('tgsrtc:218', 'X', 'Y')]);
    const c = itin('c', [bus('tgsrtc:219')]);
    const d = itin('d', [bus('tgsrtc:218', 'P', 'Q')]);
    expect(rankItineraries([a, b, c, d]).map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });
});
