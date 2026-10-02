# Agent Rules — Hyd Transit

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
