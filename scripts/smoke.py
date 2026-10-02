"""M7 smoke test: exercises every v1 endpoint against a running API + OTP.

Usage: python3 scripts/smoke.py [API_BASE]
Fails non-zero on the first broken expectation.
"""
import json
import sys
import urllib.parse
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"


def call(method, path, body=None, headers=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **(headers or {})},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, None


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name, detail[:160])
    if not cond:
        sys.exit(1)


s, health = call("GET", "/health")
check("health", s == 200 and health.get("api") == "ok", json.dumps(health))
check("otp up", health.get("otp") == "ok", json.dumps(health))
check("db up", health.get("db") == "ok", json.dumps(health))

# M2: bus trip Koti -> Dilsukhnagar
s, trips = call(
    "GET",
    "/v1/plan?fromLat=17.385&fromLon=78.486&toLat=17.368&toLon=78.524",
)
check("plan status", s == 200, f"status={s}")
check("plan options", isinstance(trips, list) and 1 <= len(trips) <= 3, f"n={len(trips) if isinstance(trips, list) else '?'}")
bus_legs = [l for t in trips for l in t["legs"] if l["mode"] in ("BUS", "METRO")]
check("plan has transit leg", len(bus_legs) > 0)
check("leg instruction", all(l.get("instruction") for t in trips for l in t["legs"]))

# M2: metro trip Miyapur -> LB Nagar (daytime: metro runs ~06:00-23:00)
s, metro = call(
    "GET",
    "/v1/plan?fromLat=17.4965&fromLon=78.373&toLat=17.345&toLon=78.552&when=2026-10-05T10:00:00%2B05:30",
)
check("metro plan", s == 200 and any(
    l["mode"] == "METRO" for t in metro for l in t["legs"]), f"status={s}")

# M3: stop search / nearby / departures
s, stops = call("GET", "/v1/stops/search?q=" + urllib.parse.quote("Koti"))
check("stop search", s == 200 and len(stops) > 0, f"n={len(stops) if isinstance(stops, list) else '?'}")
sid = stops[0]["stopId"]
s, near = call("GET", "/v1/stops/nearby?lat=17.385&lon=78.486&radius=500")
check("nearby", s == 200 and len(near) > 0)
s, deps = call("GET", f"/v1/stops/{urllib.parse.quote(sid, safe='')}/arrivals?limit=5")
check("departures", s == 200 and isinstance(deps, list) and all(
    d.get("source") in ("live", "scheduled") for d in deps), f"n={len(deps) if isinstance(deps, list) else '?'}")

# M5: report + alerts round-trip
dev = "smoke-device-1"
s, rep = call("POST", "/v1/reports",
              {"type": "NOT_RUNNING", "stopId": sid, "note": "smoke"},
              {"x-device-id": dev})
check("report submit", s in (200, 201) and rep.get("id"), f"status={s}")
s, alerts = call("GET", "/v1/alerts?stopId=" + urllib.parse.quote(sid))
check("alerts show report", s == 200 and any(a.get("id") == rep.get("id") for a in alerts))

# Validation: out-of-area rejected
s, err = call("GET", "/v1/plan?fromLat=0&fromLon=0&toLat=17.3&toLon=78.5")
check("out-of-area 400", s == 400 and (err or {}).get("error", {}).get("code") in (
    "OUT_OF_AREA", "INVALID_PARAMS", "REQUEST_FAILED", "BAD_REQUEST"), f"status={s}")

print("ALL SMOKE TESTS PASSED")
