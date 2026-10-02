import { metroFareInr, resetFares } from './fare-table';

describe('metroFareInr (real HMRL feed)', () => {
  beforeEach(() => resetFares());

  it('prices Miyapur -> LB Nagar from the fare tables', () => {
    const fare = metroFareInr('hmrl:MYP1', 'hmrl:LBN1');
    expect(fare).toBeGreaterThan(0);
  });

  it('returns null for non-metro stops', () => {
    expect(metroFareInr('tgsrtc:X', 'tgsrtc:Y')).toBeNull();
  });

  it('returns null for unknown pairs', () => {
    expect(metroFareInr('hmrl:NOPE1', 'hmrl:NOPE2')).toBeNull();
  });
});
