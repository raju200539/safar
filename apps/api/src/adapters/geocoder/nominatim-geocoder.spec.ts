import { mapNominatimResults } from '../../ports/geocoder';
import { resetGeocoderCache } from './nominatim-geocoder';

describe('mapNominatimResults', () => {
  beforeEach(() => resetGeocoderCache());

  it('maps results to places with short names', () => {
    const out = mapNominatimResults([
      {
        display_name: 'Charminar, Hyderabad, Telangana, India',
        lat: '17.3616',
        lon: '78.4747',
      },
      { display_name: 'Nowhere', lat: 'x', lon: 'y' },
    ]);
    expect(out).toEqual([
      { name: 'Charminar, Hyderabad', lat: 17.3616, lon: 78.4747, kind: 'place' },
    ]);
  });
});
