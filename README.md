# Hyd Transit (working name)

Bus-first trip planner for Hyderabad: TGSRTC city buses + Hyderabad Metro,
with plain-language boarding instructions. See `docs/SPEC.md`.

## Stack (verified Oct 2026)

- Mobile: Expo SDK 57 (stable, Jun 2026), React Native, Expo Router, TypeScript
- API: NestJS 11 + TypeScript strict
- Routing: OpenTripPlanner `2.9.0` (pinned; 2.10.0 has a transit-routing
  regression with this data — see `docs/otp-queries.md`)
- DB: Postgres 16
- Monorepo: pnpm workspaces (pnpm 10.x)

## Prerequisites

- Node 24, pnpm 10 (`npm install -g pnpm@latest`)
- Docker Desktop 4.93+ with the engine running. If `docker` is not on PATH,
  it lives at `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe`.
- ~2 GB free for the OTP image + ~600 MB for the OSM extract.

## Quickstart

1. Copy env: `cp .env.example .env`
2. Install: `pnpm install`
3. Data (gitignored, ~600 MB total):
   - `bash scripts/fetch-data.sh` — downloads the TGSRTC GTFS (~10 MB) and
     prints the manual HMRL download step.
   - Geofabrik India Southern-Zone OSM → clip with `bash scripts/clip-osm.sh`
     (needs `osmium`; or see M1 notes for the Docker one-liner).
4. Start infra: `docker compose up -d` (Postgres + OTP; OTP builds the graph
   on first boot, ~2 min, then serves on `:8080`).
5. Migrate: pipe `apps/api/migrations/*.sql` into Postgres
   (`docker exec -i hyd-postgres psql -U hyd -d hydtransit < file`).
6. Start API: `pnpm dev:api` → `GET http://localhost:3000/health`
   (`status: ok` once OTP + DB are reachable).
7. Start mobile: `pnpm dev:mobile` → scan QR with Expo Go (Android).
   Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env` to
   `http://<laptop-LAN-IP>:3000` (Expo only reads .env inside apps/mobile).

## API (v1)

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/plan?fromLat&fromLon&toLat&toLon&when&arriveBy` | ≤3 itineraries, per-leg `instruction` |
| GET | `/v1/stops/search?q=` | ≥2 chars |
| GET | `/v1/stops/nearby?lat&lon&radius=500` | radius clamped 50–2000 m |
| GET | `/v1/stops/:id/arrivals` | `source: live \| scheduled` (scheduled until M6) |
| GET | `/v1/alerts?stopId=&routeId=` | last 6 h |
| POST | `/v1/reports` + `x-device-id` | 5/hour per device |
| GET | `/health` | `{ api, otp, db, live }` |

Errors always look like `{ "error": { "code": "...", "message": "..." } }`.

## Milestones

Work one milestone at a time — see `docs/SPEC.md` §3.2. Live departures (M6)
are gated on `docs/gamyam-findings.md` (human task); until then every time is
labelled `scheduled`.
