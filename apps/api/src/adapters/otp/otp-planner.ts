// M2: OTP GraphQL adapter. M0 stub keeps `adapters/` as the only
// place that will know about OTP.
import type { TripPlanner } from '../../ports/trip-planner';

export class OtpPlanner implements TripPlanner {
  constructor(private readonly baseUrl: string = process.env.OTP_URL ?? '') {}

  async plan(): Promise<never> {
    throw new Error(
      `OtpPlanner not wired yet (OTP_URL=${this.baseUrl || 'unset'}). See M1/M2.`,
    );
  }
}
