# Gamyam findings (M6 gate)

Date: 2026-10-02. Inspected by the human via HTTP Toolkit traffic interception.

## Outcome: endpoints not obtainable — app uses certificate pinning

- With interception active, the Gamyam app fails to load data and throws errors.
- Intercept log shows `Certificate rejected` for its backend/map connections
  (including `outpost.mapmyindia.com`, `sdkconfig.mappls.com` — maps come from
  Mappls/MapMyIndia SDK) and `Aborted connection` elsewhere.
- No Gamyam API host, path, or request/response shape could be observed.

## Decision

Per project rules (AGENTS.md: do not attempt to bypass authentication,
certificate pinning, or any access control on a third-party service), no
bypass will be attempted. M6 stays blocked until and unless a legitimate,
documented live source appears. The app correctly labels everything
`scheduled` in the meantime.

## Legitimate alternatives (not yet pursued)

1. Official TGSRTC developer API or GTFS-RT feed, if one is published.
2. Open-data request to TGSRTC / OpenCity for a realtime feed.
3. Ship v1 timetable-only (current state).
