// GraphQL documents for OTP's GTFS API (endpoint /otp/gtfs/v1).
// Shapes verified by introspecting a live OTP 2.10.0 (see docs/otp-queries.md).
// Keep queries minimal: only fields the mappers read.

export const PLAN_QUERY = /* GraphQL */ `
  query Plan(
    $origin: PlanLabeledLocationInput!
    $destination: PlanLabeledLocationInput!
    $dateTime: PlanDateTimeInput
    $modes: PlanModesInput
    $first: Int
    $via: [PlanViaLocationInput!]
  ) {
    planConnection(
      origin: $origin
      destination: $destination
      dateTime: $dateTime
      modes: $modes
      first: $first
      via: $via
    ) {
      edges {
        node {
          start
          end
          duration
          walkDistance
          numberOfTransfers
          legs {
            mode
            start {
              scheduledTime
            }
            end {
              scheduledTime
            }
            duration
            distance
            headsign
            from {
              name
              lat
              lon
              stop {
                gtfsId
                code
                name
                platformCode
                parentStation {
                  gtfsId
                  name
                }
              }
            }
            to {
              name
              lat
              lon
              stop {
                gtfsId
                code
                name
                platformCode
                parentStation {
                  gtfsId
                  name
                }
              }
            }
            route {
              gtfsId
              shortName
              longName
              color
              agency {
                name
              }
            }
            trip {
              gtfsId
              tripHeadsign
              tripShortName
            }
            stopCalls {
              stopLocation {
                ... on Stop {
                  gtfsId
                  code
                  name
                  lat
                  lon
                  platformCode
                }
              }
            }
            legGeometry {
              points
            }
          }
        }
      }
    }
  }
`;

export const STOPS_BY_NAME_QUERY = /* GraphQL */ `
  query StopsByName($name: String!) {
    stops(name: $name) {
      gtfsId
      code
      name
      lat
      lon
    }
  }
`;

export const STOPS_BY_RADIUS_QUERY = /* GraphQL */ `
  query StopsByRadius($lat: Float!, $lon: Float!, $radius: Int!, $first: Int!) {
    stopsByRadius(lat: $lat, lon: $lon, radius: $radius, first: $first) {
      edges {
        node {
          distance
          stop {
            gtfsId
            code
            name
            lat
            lon
            vehicleMode
          }
        }
      }
    }
  }
`;

export const STOP_DEPARTURES_QUERY = /* GraphQL */ `
  query StopDepartures($id: String!, $n: Int!) {
    stop(id: $id) {
      gtfsId
      name
      stoptimesWithoutPatterns(numberOfDepartures: $n, omitNonPickups: true) {
        serviceDay
        scheduledArrival
        realtimeArrival
        realtime
        headsign
        trip {
          gtfsId
          tripHeadsign
          route {
            shortName
            longName
          }
        }
      }
    }
  }
`;
