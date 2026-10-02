# Hyd Transit (working name) — v1 Spec

Audience: an AI coding agent (OpenCode) and the human developer working with it.
Contents: Part 1 PRD, Part 2 Architecture, Part 3 Build Targets, Part 4 Agent Rules (copy into `AGENTS.md`).

---

# Part 1 — Product Requirements (PRD)

## 1.1 Problem
People in Hyderabad often take Rapido or other ride-sharing instead of the city bus because they cannot tell:
- which bus to take,
- where exactly to board,
- where to change buses (or switch to the Metro),
- when the bus will arrive.

Existing options: Google Maps gives routes and Metro timings; TGSRTC's Gamyam app gives live tracking, mainly for Pushpak and Express-and-above services. Neither gives a simple, bus-first, "do exactly this" journey for ordinary city bus riders.

## 1.2 Product
A mobile app that takes a start and a destination and returns a complete **bus + Metro** journey with plain-language boarding and drop-off instructions, and live arrival times where live data exists.

## 1.3 Target users
First-time and occasional city bus riders in Hyderabad (students, office commuters, newcomers) who currently default to ride-sharing because buses feel confusing.

## 1.4 Goals (v1)
1. Given any two points in Hyderabad, return up to 3 journey options using TGSRTC city buses and Hyderabad Metro, including transfers and walking legs.
2. Every transit leg shows a plain-language instruction: which bus/train, which stop to board at, which direction, where to get off, and how many stops.
3. Show nearby stops and the next departures for a stop.
4. Show live ETA for buses where a live source is available; otherwise clearly label times as "scheduled".
5. Let users report a service disruption and see recent reports for a stop or route.

## 1.5 Non-goals (v1)
Ticketing or payments; user accounts or login; offline mode; push notifications; iOS release build; MMTS; auto-rickshaw, cab or bike modes; fare calculation; web app.

## 1.6 User stories
- As a rider, I enter "from" and "to" (or use my location) and see journey options sorted by arrival time.
- As a rider, I open an option and see step-by-step legs: walk to stop, board bus 218 towards X, get off at Y after 6 stops, walk 200 m, board Metro Red Line towards Z.
- As a rider at a stop, I see which buses arrive next and whether the time is live or scheduled.
- As a rider, I report "bus not running / route diverted" for a route or stop.
- As a rider, I can use the app in English; core screens also have Telugu strings.

## 1.7 Features and priority

| Feature | Priority |
|---|---|
| Trip planning (bus + Metro, transfers, walking) | Must |
| Boarding / drop-off instructions per leg | Must |
| Stop search by name, nearby stops, pick-on-map, use current location | Must |
| Stop departures (scheduled) | Must |
| Map view of itinerary (polyline + stops) | Must |
| Live ETA overlay for buses | Should (blocked on Gamyam findings, see 3.2 M6) |
| User-submitted disruption reports | Should |
| Telugu UI strings for core screens | Should |
| Landmark search (geocoding) | Should |
| Saved places | Could |

## 1.8 Screens
1. **Home / Plan:** from and to fields, "use my location", swap button, recent searches (local only).
2. **Results:** up to 3 itinerary cards (departure to arrival time, duration, transfers, mode chips).
3. **Itinerary detail:** ordered legs with instructions, expandable intermediate stops, map toggle.
4. **Stop detail:** stop name, upcoming departures with live/scheduled badge, recent reports.
5. **Report sheet:** pick type (not running, diverted, overcrowded, other), optional note, submit.

## 1.9 Success criteria for v1
- 5 real routes the developer personally travels return sensible itineraries (checked against reality).
- Plan request returns in under 3 s (excluding first cold start).
- Median time from app open to seeing a journey option under 10 s on a normal mobile connection.
- 10 real test users complete a trip search without help.

## 1.10 Risks and assumptions
- **Live data source is undocumented.** Gamyam's endpoints may be private, may change, or may not cover ordinary city buses. v1 must work fully without live data.
- **Timetable accuracy.** GTFS schedules may not match actual bus behaviour. Always label scheduled vs live.
- **Competition.** Google Maps already shows Metro timings and TGSRTC bus real-time updates were announced as coming; verify current Google Maps coverage on a few routes before positioning the product. Differentiation is the experience (boarding instructions, simplicity, Telugu), not data exclusivity.
- **Licensing.** Check license terms of the TGSRTC and HMRL GTFS feeds before public release.
- **Hosting.** OpenTripPlanner needs a few GB of RAM; it will not run on typical free hosting tiers.

---

# Part 2 — Architecture

## 2.1 Overview

```
Mobile app (Expo / React Native, TypeScript)
        │ REST (JSON)
        ▼
API (NestJS, TypeScript)
  use cases: PlanTrip, SearchStops, NearbyStops, StopDepartures,
             SubmitReport, ListAlerts
        │ ports (interfaces)
 ┌──────┼───────────────┬───────────────────┬─────────────┐
 ▼      ▼               ▼                   ▼             ▼
TripPlanner   TransitSchedule   LiveVehicleSource   ReportStore   Geocoder
 │             │                 │                   │             │
 OtpPlanner    OtpSchedule       GamyamLiveSource    PostgresStore Nominatim/
 (OpenTrip-    (via OTP)         (phase M6)                        stop-search
  Planner 2)
```

Principles:
- **Clean layers.** `domain` (plain types, no framework imports) → `application` (use cases) → `ports` (interfaces) → `adapters` (OTP, Gamyam, Postgres, geocoder) → `http` (controllers).
- **Data sources are swappable.** Nothing outside `adapters/` knows about OTP or Gamyam.
- **Mobile is a thin client.** All routing, ID mapping and instruction generation happen on the server.
- **Live data is an overlay.** Planning and departures work with scheduled data only. Live ETA is added when a live source is available and matches a trip.
- **Upstream calls only from the backend**, never from the phone.

## 2.2 Tech stack
- Mobile: Expo (SDK 57 stable), React Native, TypeScript, Expo Router, `react-native-maps` (works in Expo Go; wrap in a `MapView` component so MapLibre can replace it later), `@mapbox/polyline` for decoding geometry, `i18next` for strings.
- API: NestJS (TypeScript), class-validator, Jest.
- Routing: OpenTripPlanner 2.10.0 in Docker (pinned), fed with the two GTFS feeds plus an OpenStreetMap extract. Use OTP's GTFS GraphQL API.
- Storage: Postgres 16 (Docker) for reports and live-to-GTFS ID mappings; in-memory cache behind a `LiveCache` port (Redis later).
- Monorepo: pnpm workspaces (pnpm 10.x).

## 2.3 Repository layout

```
hyd-transit/
├─ AGENTS.md
├─ docs/
│  ├─ SPEC.md                  # this file
│  └─ gamyam-findings.md       # written by the human (see M6)
├─ docker-compose.yml          # otp, postgres
├─ data/                       # gitignored except otp config
│  ├─ gtfs/                    # tgsrtc.zip, hmrl.zip
│  ├─ osm/                     # hyderabad.osm.pbf
│  └─ otp/                     # build-config.json, router-config.json
├─ scripts/
│  ├─ fetch-data.sh
│  └─ clip-osm.sh
├─ packages/
│  └─ shared/                  # TS types: Itinerary, Leg, Arrival, Place, Report
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ domain/
│  │     ├─ application/       # use cases + instruction generator
│  │     ├─ ports/
│  │     ├─ adapters/{otp,gamyam,postgres,geocoder}/
│  │     └─ http/
│  └─ mobile/
│     ├─ app/                  # expo-router screens
│     └─ src/{features/{plan,stops,reports},api,components,i18n}/
└─ pnpm-workspace.yaml
```

## 2.4 Data sources

| Source | Use | Notes |
|---|---|---|
| TGSRTC GTFS (static) | bus routes, stops, timetables | Listed on MobilityDatabase as official feed `mdb-3361`, ~1031 routes. Producer URL: `https://data.opencity.in/dataset/88e2d145-7ec6-4666-88dd-6cf18b18312e/resource/1b0d18bb-b2fb-4a79-8ed0-1e071da5790c/download/telangana_opendata_gtfs_tgsrtc_08_february_2026.zip` |
| HMRL GTFS (static) | Metro lines, stations, timetables | Dataset page: `https://data.opencity.in/dataset/hyderabad-metro-rail-gtfs`. Download manually and save as `data/gtfs/hmrl.zip`. |
| OpenStreetMap (Geofabrik India "Southern Zone") | walking network for walk legs and transfers | Clip to a Hyderabad bounding box with `osmium` to keep the graph small. |
| Gamyam live data | live bus positions and ETA | Unverified, undocumented. Only built after `docs/gamyam-findings.md` exists. |

OTP feed config must give each feed its own `feedId` (`tgsrtc`, `hmrl`) so stop and route IDs never collide. Tune walking-transfer limits in `router-config.json` so Metro stations connect to nearby bus stops.

## 2.5 Domain model (shared types)

```ts
type Mode = 'WALK' | 'BUS' | 'METRO';

interface Place { name: string; lat: number; lon: number; stopId?: string }

interface Leg {
  mode: Mode;
  from: Place;
  to: Place;
  startTime: string;          // ISO 8601
  endTime: string;
  durationSec: number;
  distanceM?: number;
  route?: { id: string; shortName: string; longName?: string; agency: string };
  headsign?: string;
  stopCount?: number;         // stops travelled on this leg
  intermediateStops?: Place[];
  geometry: string;           // encoded polyline
  instruction: string;        // generated, plain language
  live?: { etaSec: number; source: 'live' };  // absent => scheduled
}

interface Itinerary {
  id: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  transfers: number;
  walkDistanceM: number;
  legs: Leg[];
}

interface Arrival {
  routeShortName: string;
  headsign: string;
  scheduledTime: string;
  liveTime?: string;
  source: 'live' | 'scheduled';
}

interface Report {
  id: string;
  type: 'NOT_RUNNING' | 'DIVERTED' | 'OVERCROWDED' | 'OTHER';
  routeId?: string;
  stopId?: string;
  note?: string;
  createdAt: string;
}
```

## 2.6 Ports

```ts
interface TripPlanner {
  plan(q: { from: LatLon; to: LatLon; when?: Date; arriveBy?: boolean }): Promise<Itinerary[]>;
}
interface TransitSchedule {
  searchStops(q: string, limit: number): Promise<Place[]>;
  nearbyStops(p: LatLon, radiusM: number): Promise<Place[]>;
  departures(stopId: string, limit: number): Promise<Arrival[]>; // scheduled only
}
interface LiveVehicleSource {
  enabled(): boolean;
  arrivalsForStop(stopId: string): Promise<LiveArrival[]>;
}
interface ReportStore {
  add(r: NewReport): Promise<Report>;
  recent(filter: { stopId?: string; routeId?: string; sinceMinutes: number }): Promise<Report[]>;
}
interface Geocoder { search(q: string, limit: number): Promise<Place[]>; }
```

## 2.7 HTTP API (v1)

| Method | Path | Returns |
|---|---|---|
| GET | `/v1/plan?fromLat&fromLon&toLat&toLon&when&arriveBy` | `Itinerary[]` (max 3) |
| GET | `/v1/stops/search?q=` | `Place[]` |
| GET | `/v1/stops/nearby?lat&lon&radius=500` | `Place[]` |
| GET | `/v1/stops/:id/arrivals` | `Arrival[]` |
| GET | `/v1/alerts?stopId=&routeId=` | `Report[]` (last 6 hours) |
| POST | `/v1/reports` | `Report` |
| GET | `/health` | status of API, OTP, DB, live source |

Rules: validate all input; reasonable bounds on coordinates (Hyderabad region only); per-device rate limit on `POST /v1/reports` using an anonymous device ID header; consistent error shape `{ error: { code, message } }`.

## 2.8 Instruction generator (the differentiator)
A pure function in `application/` that turns each `Leg` into plain text, fully unit-tested. Examples:
- WALK: "Walk 250 m to {stop}."
- BUS: "Board bus {shortName} towards {headsign} at {fromStop}. Get off at {toStop} after {stopCount} stops."
- METRO: "Take the {line} towards {headsign} from {station}. Get off at {station} after {stopCount} stops."
- Transfer: "Change here: walk {n} m to {stop}."
Strings come from i18n keys, not hard-coded English, so Telugu can be added.

## 2.9 Live overlay (phase M6 only)
- `GamyamLiveSource` is polled by a background job in the API (not by clients), results cached with a short TTL.
- A matching module maps live vehicles to GTFS trips/stops (by route number and stop). Isolate it in one file with tests; failed matches fall back to scheduled.
- Feature flag `LIVE_ENABLED` (default false) acts as a kill switch.
- Never ship client-side calls to the upstream source.

## 2.10 Configuration (env)
`OTP_URL`, `DATABASE_URL`, `LIVE_ENABLED`, `GEOCODER_URL`, `PORT`. Provide `.env.example`; never commit `.env`. Add `.env` to `.gitignore` in the first commit.

---

# Part 3 — Build Targets

## 3.1 Definition of done for v1
- `docker compose up` starts OTP (with both feeds loaded) and Postgres; `pnpm dev` starts API and mobile.
- `/v1/plan` returns bus and Metro itineraries with transfers and per-leg instructions for at least 5 real Hyderabad routes.
- Mobile app (run in Expo Go on Android) supports: plan, results, itinerary detail with map, stop search/nearby, stop departures, report submission.
- Scheduled vs live is always labelled.
- Unit tests for the instruction generator and ID/mapping logic; one integration smoke test that queries a running OTP.
- README with setup steps.

## 3.2 Milestones (stop and report after each)

**M0 — Scaffold.** Monorepo, pnpm workspaces, `packages/shared`, NestJS app, Expo app, lint/format/test setup, `.gitignore` (including `.env`, `data/gtfs`, `data/osm`), `.env.example`, `docker-compose.yml` with Postgres and OTP service stubs.
*Done when:* `pnpm install`, API `/health` responds, Expo app opens in Expo Go.

**M1 — OTP with real data.** `scripts/fetch-data.sh` (downloads TGSRTC GTFS; prints instructions for the manual HMRL download), `scripts/clip-osm.sh`, `data/otp/build-config.json` and `router-config.json` with feed IDs `tgsrtc` and `hmrl`.
*Done when:* OTP builds the graph and a GraphQL `plan` query between two known Hyderabad points returns a bus itinerary; a Metro-including query also works. Record the sample queries in `docs/otp-queries.md`.

**M2 — Plan API.** Domain types, `TripPlanner` port, `OtpPlanner` adapter (GraphQL to `Itinerary`), `PlanTrip` use case, instruction generator with tests, `/v1/plan`.
*Done when:* curl on `/v1/plan` returns up to 3 itineraries, each leg with an `instruction`.

**M3 — Stops API.** `TransitSchedule` adapter via OTP, `/v1/stops/search`, `/nearby`, `/:id/arrivals`; optional `Geocoder` adapter (rate-limited, cached, behind the port).
*Done when:* nearby and departures work for a known stop.

**M4 — Mobile core.** Plan screen, results, itinerary detail with map polylines, stop detail, i18n scaffolding (English complete, Telugu for core strings).
*Done when:* full flow works on a phone against the local API (use the laptop's LAN IP as base URL).

**M5 — Reports.** Postgres adapter, `/v1/reports`, `/v1/alerts`, report sheet and display on stop detail.
*Done when:* a report submitted on one device appears on stop detail.

**M6 — Live overlay. BLOCKED until `docs/gamyam-findings.md` exists.** The human inspects the Gamyam app's network behaviour and documents endpoints, request/response shapes and which bus types return live data. Then implement `GamyamLiveSource`, the trip-matching module and the `LIVE_ENABLED` flag; show a "Live" badge only when a match exists.
*Done when:* at least one real route shows live ETA, and disabling the flag cleanly falls back to scheduled.

**M7 — Hardening.** Error states, loading states, timeouts, empty states ("no route found"), basic logging, README.

## 3.3 Acceptance tests (manual, by the human)
1. Plan from a known home area to a known workplace; compare against reality.
2. Plan a trip that requires a bus-to-Metro transfer.
3. Plan a trip that requires two bus legs.
4. Open a busy stop; confirm departures look plausible.
5. Turn off the network mid-request; confirm a clear error state.

---

# Part 4 — Agent Rules (copy into `AGENTS.md`)

- Read `docs/SPEC.md` before starting. Work one milestone at a time; stop after each and summarise what changed and how to verify it.
- TypeScript strict mode everywhere. No `any` unless justified in a comment.
- Respect layers: `domain` imports nothing from frameworks; `application` depends only on `domain` and `ports`; only `adapters` talk to OTP, Gamyam, Postgres or the network.
- Do not add dependencies beyond those listed in the spec without asking.
- Never call external transit/live APIs from the mobile app.
- Do not start M6 unless `docs/gamyam-findings.md` exists. Do not attempt to bypass authentication, certificate pinning or any access control on a third-party service.
- Never commit secrets or `.env`. Never commit downloaded GTFS or OSM data.
- Every new use case or pure function gets a unit test. Run lint, type-check and tests before declaring a milestone done.
- Keep commits small, with clear messages. Prefer simple code over clever code.
- If the spec is ambiguous or a data assumption fails (for example the feed lacks a field), stop and ask rather than guessing.
