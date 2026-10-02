# Hyd Transit (working name)

Bus-first trip planner for Hyderabad: TGSRTC city buses + Hyderabad Metro,
with plain-language boarding instructions. See `docs/SPEC.md`.

## Stack (verified Oct 2026)

- Mobile: Expo SDK 57 (stable, Jun 2026), React Native, Expo Router, TypeScript
- API: NestJS 11 + TypeScript strict
- Routing: OpenTripPlanner `2.10.0` (pinned Docker tag, Sep 2026 release)
- DB: Postgres 16
- Monorepo: pnpm workspaces (pnpm 10.x)

## Quickstart (M0)

1. Copy env: `cp .env.example .env`
2. Install: `pnpm install`
3. Start infra (needs Docker Desktop): `docker compose up -d`
4. Fetch transit data: `bash scripts/fetch-data.sh` (see `docs/otp-queries.md` after M1)
5. Start API: `pnpm dev:api` → `GET http://localhost:3000/health`
6. Start mobile: `pnpm dev:mobile` → scan QR with Expo Go (Android)

Without Docker, steps 3–4 are skipped: API still boots with
`OTP_URL`/`DATABASE_URL` unreachable and `/health` reports `degraded`.

## Milestones

Work one milestone at a time — see `docs/SPEC.md` §3.2. Stop after each
and record how to verify it.
