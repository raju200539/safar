// M3 (optional): Nominatim geocoder behind the Geocoder port.
// Rate-limited + cached. Never called from mobile directly.
import type { Geocoder } from '../../ports/geocoder';

export class NominatimGeocoder implements Geocoder {
  async search(): Promise<never> {
    throw new Error('NominatimGeocoder lands in M3.');
  }
}
