import type { Itinerary, LatLon } from '@hyd/shared';
import type { TripPlanner } from '../ports/trip-planner';

/** M2: PlanTrip use case. M0 stub — throws until OtpPlanner lands. */
export class PlanTrip {
  constructor(private readonly planner: TripPlanner) {}

  async execute(q: {
    from: LatLon;
    to: LatLon;
    when?: Date;
    arriveBy?: boolean;
  }): Promise<Itinerary[]> {
    return this.planner.plan(q);
  }
}
