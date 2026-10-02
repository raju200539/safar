import type { Leg } from '@hyd/shared';
import { buildInstruction } from './instructions';

describe('buildInstruction (M0 shape)', () => {
  it('builds a walk instruction', () => {
    const leg = {
      mode: 'WALK',
      from: { name: 'A', lat: 17.4, lon: 78.4 },
      to: { name: 'Koti Bus Stop', lat: 17.4, lon: 78.48 },
      startTime: '2026-10-02T10:00:00+05:30',
      endTime: '2026-10-02T10:05:00+05:30',
      durationSec: 300,
      distanceM: 250,
      geometry: '',
      instruction: '',
    } satisfies Leg;
    expect(buildInstruction(leg)).toContain('Koti Bus Stop');
  });
});
