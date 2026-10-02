import {
  dedupePlaces,
  mapDepartures,
  mapItinerary,
  mapLeg,
  mapStop,
  toISO,
} from './mappers';

const WALK_LEG = {
  mode: 'WALK',
  start: { scheduledTime: '2026-10-05T10:00:00+05:30' },
  end: { scheduledTime: '2026-10-05T10:05:00+05:30' },
  duration: 300,
  distance: 250,
  from: { name: 'Home', lat: 17.44, lon: 78.45, stop: null },
  to: {
    name: 'Koti',
    lat: 17.385,
    lon: 78.486,
    stop: { gtfsId: 'tgsrtc:Koti1', code: null, name: 'Koti' },
  },
  route: null,
  trip: null,
  headsign: null,
  stopCalls: [],
  legGeometry: { points: 'abc' },
};

const BUS_LEG = {
  mode: 'BUS',
  start: { scheduledTime: '2026-10-05T10:05:00+05:30' },
  end: { scheduledTime: '2026-10-05T10:35:00+05:30' },
  duration: 1800,
  distance: 8000,
  headsign: null,
  from: {
    name: 'Koti',
    lat: 17.385,
    lon: 78.486,
    stop: { gtfsId: 'tgsrtc:Koti1', code: null, name: 'Koti' },
  },
  to: {
    name: 'Dilsukhnagar',
    lat: 17.368,
    lon: 78.524,
    stop: { gtfsId: 'tgsrtc:Dil1', code: null, name: 'Dilsukhnagar' },
  },
  // TGSRTC GTFS has no route_short_name: OTP returns shortName null.
  route: {
    gtfsId: 'tgsrtc:218',
    shortName: null,
    longName: '218',
    agency: { name: 'TGSRTC' },
  },
  trip: { gtfsId: 'tgsrtc:t1', tripHeadsign: 'Dilsukhnagar' },
  stopCalls: [
    { stopLocation: { gtfsId: 'tgsrtc:Koti1', name: 'Koti', lat: 1, lon: 1 } },
    { stopLocation: { gtfsId: 'tgsrtc:S1', name: 'Chaderghat', lat: 1, lon: 1 } },
    { stopLocation: { gtfsId: 'tgsrtc:S2', name: 'Malakpet', lat: 1, lon: 1 } },
    { stopLocation: { gtfsId: 'tgsrtc:Dil1', name: 'Dilsukhnagar', lat: 1, lon: 1 } },
  ],
  legGeometry: { points: 'def' },
};

describe('mappers', () => {
  it('maps a walk leg', () => {
    const leg = mapLeg(WALK_LEG);
    expect(leg?.mode).toBe('WALK');
    expect(leg?.instruction).toContain('Koti');
  });

  it('falls back to feed-scoped route id for the bus number', () => {
    const leg = mapLeg(BUS_LEG);
    expect(leg?.route?.shortName).toBe('218');
    expect(leg?.stopCount).toBe(3);
    expect(leg?.intermediateStops?.map((s) => s.name)).toEqual([
      'Chaderghat',
      'Malakpet',
    ]);
    expect(leg?.instruction).toContain('218');
  });

  it('maps SUBWAY to METRO', () => {
    const leg = mapLeg({ ...BUS_LEG, mode: 'SUBWAY' });
    expect(leg?.mode).toBe('METRO');
  });

  it('drops legs with unknown modes', () => {
    expect(mapLeg({ ...BUS_LEG, mode: 'HORSE' })).toBeNull();
  });

  it('maps an itinerary with transfers from numberOfTransfers', () => {
    const it = mapItinerary(
      {
        start: '2026-10-05T10:00:00+05:30',
        end: '2026-10-05T10:35:00+05:30',
        duration: 2100,
        walkDistance: 250,
        numberOfTransfers: 0,
        legs: [WALK_LEG, BUS_LEG],
      },
      0,
    );
    expect(it?.legs).toHaveLength(2);
    expect(it?.transfers).toBe(0);
    expect(it?.walkDistanceM).toBe(250);
  });

  it('maps stops and departures (serviceDay + offset shape)', () => {
    expect(
      mapStop({ gtfsId: 'tgsrtc:X', name: 'Koti', lat: 1, lon: 2 })?.stopId,
    ).toBe('tgsrtc:X');
    const deps = mapDepartures([
      {
        serviceDay: 1790601600,
        scheduledArrival: 36000,
        realtimeArrival: null,
        realtime: false,
        trip: {
          tripHeadsign: 'Dilsukhnagar',
          route: { shortName: null, longName: '218' },
        },
      },
    ]);
    expect(deps[0]?.source).toBe('scheduled');
    expect(deps[0]?.routeShortName).toBe('218');
    expect(deps[0]?.scheduledTime).toContain('2026');
  });

  it('toISO handles ISO strings and epoch millis', () => {
    expect(toISO('2026-10-05T10:00:00+05:30')).toBe(
      '2026-10-05T04:30:00.000Z',
    );
    expect(toISO(1780636200000)).toBe(new Date(1780636200000).toISOString());
  });

  it('shows metro line names instead of codes', () => {
    const leg = mapLeg({
      ...BUS_LEG,
      mode: 'SUBWAY',
      route: {
        gtfsId: 'hmrl:RED',
        shortName: 'C1_RED',
        longName: 'Miyapur - LB Nagar',
        agency: { name: 'HMRL' },
      },
    });
    expect(leg?.route?.shortName).toBe('Red Line');
  });

  it('dedupes same-name stops', () => {
    const places = dedupePlaces([
      { name: 'Koti', lat: 17.38, lon: 78.48, stopId: 'tgsrtc:A' },
      { name: 'Koti', lat: 17.3801, lon: 78.4801, stopId: 'tgsrtc:B' },
      { name: 'Koti Bank Street', lat: 17.39, lon: 78.49 },
    ]);
    expect(places.map((p) => p.name)).toEqual(['Koti', 'Koti Bank Street']);
  });
});
