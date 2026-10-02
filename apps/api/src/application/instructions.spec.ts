import type { Leg } from '@hyd/shared';
import { buildInstruction } from './instructions';

function busLeg(over: Partial<Leg> = {}): Leg {
  return {
    mode: 'BUS',
    from: { name: 'Koti', lat: 17.38, lon: 78.48 },
    to: { name: 'Dilsukhnagar', lat: 17.36, lon: 78.52 },
    startTime: '2026-10-02T10:00:00+05:30',
    endTime: '2026-10-02T10:30:00+05:30',
    durationSec: 1800,
    route: { id: 'tgsrtc:218', shortName: '218', agency: 'TGSRTC' },
    headsign: 'Dilsukhnagar',
    stopCount: 6,
    geometry: '',
    instruction: '',
    ...over,
  };
}

describe('buildInstruction', () => {
  it('builds a bus instruction with stop count', () => {
    expect(buildInstruction(busLeg())).toBe(
      'Board bus 218 towards Dilsukhnagar at Koti. Get off at Dilsukhnagar after 6 stops.',
    );
  });

  it('builds a walk instruction with distance', () => {
    const leg = busLeg({
      mode: 'WALK',
      distanceM: 250,
      to: { name: 'Koti Bus Stop', lat: 17.38, lon: 78.48 },
    });
    expect(buildInstruction(leg)).toBe('Walk 250 m to Koti Bus Stop.');
  });

  it('formats long walks in km', () => {
    const leg = busLeg({
      mode: 'WALK',
      distanceM: 1500,
      to: { name: 'Station', lat: 0, lon: 0 },
    });
    expect(buildInstruction(leg)).toContain('1.5 km');
  });

  it('builds a metro instruction', () => {
    const leg = busLeg({
      mode: 'METRO',
      route: { id: 'hmrl:RED', shortName: 'Red Line', agency: 'HMRL' },
      from: { name: 'Ameerpet', lat: 17.44, lon: 78.45 },
      to: { name: 'LB Nagar', lat: 17.34, lon: 78.55 },
      headsign: 'LB Nagar',
      stopCount: 12,
    });
    expect(buildInstruction(leg)).toBe(
      'Take the metro towards LB Nagar from Ameerpet. Get off at LB Nagar after 12 stops.',
    );
  });

  it('falls back to route id when shortName is missing (TGSRTC feed)', () => {
    const leg = busLeg({
      route: { id: 'tgsrtc:219', shortName: '219', agency: 'TGSRTC' },
    });
    expect(buildInstruction(leg)).toContain('219');
  });

  it('builds Telugu instructions', () => {
    expect(buildInstruction(busLeg(), 'te')).toContain('బస్సు');
    const walk = busLeg({
      mode: 'WALK',
      distanceM: 250,
      to: { name: 'కోఠి', lat: 0, lon: 0 },
    });
    expect(buildInstruction(walk, 'te')).toContain('నడవండి');
  });
});
