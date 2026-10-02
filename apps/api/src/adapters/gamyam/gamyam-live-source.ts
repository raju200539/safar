// M6 only — blocked until docs/gamyam-findings.md exists (SPEC §3.2).
// Do not implement live scraping here.
import type {
  LiveArrival,
  LiveVehicleSource,
} from '../../ports/live-source';

export class GamyamLiveSource implements LiveVehicleSource {
  enabled(): boolean {
    return false;
  }

  async arrivalsForStop(_stopId: string): Promise<LiveArrival[]> {
    return [];
  }
}
