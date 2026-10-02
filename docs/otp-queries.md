# OTP sample queries (M1)

Endpoint: `http://localhost:8080/otp/gtfs/v1` (GTFS GraphQL API).
Visual client: `http://localhost:8080/graphiql`.
Send header `OTPTimeout: <ms>` on slow queries.
Pinned image: `opentripplanner/opentripplanner:2.9.0` (see version note below).

## Schema notes (OTP 2.10.0, verified by introspection)

- Trip planning is `planConnection(origin, destination, dateTime, modes, first)`,
  **not** `plan(fromPlace, toPlace, date, time)`.
  - `origin`/`destination`: `PlanLabeledLocationInput!` =
    `{ location: { coordinate: { latitude, longitude } } }`
  - `dateTime`: `{ earliestDeparture: "2026-10-05T10:00:00+05:30" }`
    (or `{ latestArrival }` for arrive-by).
  - `modes`: `{ transit: { transit: [{ mode: BUS }, { mode: SUBWAY }] } }`.
    TransitMode enum: BUS, COACH, SUBWAY, RAIL, TRAM, … (metro = SUBWAY).
  - Itinerary fields: `start`, `end`, `duration`, `walkDistance`,
    `numberOfTransfers` (no `startTime`/`transfers`).
  - Leg fields: `mode`, `start { scheduledTime }`, `end { scheduledTime }`,
    `headsign` (on the leg), `stopCalls { stopLocation { ... on Stop } }`
    (no `intermediateStops`), `legGeometry { points }`.
- Stops: `stops(name:)`, `stopsByRadius(lat, lon, radius, first:)`
  → `edges { node { distance stop { gtfsId code name lat lon } } }`.
- Departures: `stop(id:) { stoptimesWithoutPatterns(...) {
  serviceDay scheduledArrival realtimeArrival realtime trip {
  tripHeadsign route { shortName } } } }`
  (`scheduledArrival` is seconds since midnight of `serviceDay`.)

## Bus query (Charminar → KPHB, BUS-only) — verified 2026-10-02

```graphql
query Plan($origin: PlanLabeledLocationInput!, $destination: PlanLabeledLocationInput!, $dateTime: PlanDateTimeInput, $modes: PlanModesInput, $first: Int) {
  planConnection(origin: $origin, destination: $destination, dateTime: $dateTime, modes: $modes, first: $first) {
    edges { node { start end duration numberOfTransfers
      legs { mode headsign
        start { scheduledTime } end { scheduledTime }
        from { name stop { gtfsId name } } to { name stop { gtfsId name } }
        route { gtfsId shortName longName } trip { tripHeadsign tripShortName }
        stopCalls { stopLocation { ... on Stop { name } } } } } }
  }
}
```
Variables: origin Charminar (17.3616, 78.4747), destination KPHB (17.4948, 78.397),
`dateTime: { earliestDeparture: "2026-10-05T10:00:00+05:30" }`,
`modes: { transit: { transit: [{ mode: BUS }] } }`, `first: 2`.
Result: 2 options, e.g. WALK → BUS 65M/123 Afzalgunj→Nampally → … → BUS
219/272G Secunderabad→KPHB (multi-bus with transfers). TGSRTC has no
`route_short_name`/`trip_headsign`, so the API falls back to the feed-scoped
id (`tgsrtc:65M/123` → `65M/123`) and `tripShortName`.

## Bus + Metro query (Koti → Dilsukhnagar) — verified 2026-10-02

Same query, all transit modes. Result: 3 options, each
WALK → SUBWAY Red Line towards L. B. Nagar
(Osmania Medical College → Dilsukh Nagar, 5–6 stops) → WALK.

## M1 debugging notes

- Image entrypoint appends `/var/opentripplanner/` as the input dir, so the
  compose `command` must be flags only (`--build --serve`).
- `transitFeeds` + `osm` URIs in `build-config.json` override directory
  scanning, so feed file names do not need the `gtfs` infix.
- HMRL `block_id`s crash build-time stay-seated transfer generation
  (`TransferIndexGenerator` NPE); disabled via `blockBasedInterlining: false`.
- `planConnection` fails at request time with
  `Index N out of bounds for length 0` on 2.10.0 (all mode sets, both feeds,
  feed-isolated graphs; direct-walk works). 2.9.0 routes the same graphs
  correctly, so v1 pins 2.9.0. Re-test on newer 2.10.x/2.11 before upgrading.
