export interface LiveArrival {
  routeShortName: string;
  headsign: string;
  eta: string;
}

export interface LiveVehicleSource {
  enabled(): boolean;
  arrivalsForStop(stopId: string): Promise<LiveArrival[]>;
}
