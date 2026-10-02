// M3: OTP-backed TransitSchedule. Stub for M0 layering.
import type { TransitSchedule } from '../../ports/transit-schedule';

export class OtpSchedule implements TransitSchedule {
  async searchStops(): Promise<never> {
    throw new Error('OtpSchedule lands in M3.');
  }
  async nearbyStops(): Promise<never> {
    throw new Error('OtpSchedule lands in M3.');
  }
  async departures(): Promise<never> {
    throw new Error('OtpSchedule lands in M3.');
  }
}
