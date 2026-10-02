#!/usr/bin/env bash
set -euo pipefail
# M1: download TGSRTC GTFS + print HMRL manual steps.
# Verified source: MobilityDatabase mdb-3361 producer via OpenCity.
# Never commit downloaded zips (see .gitignore).

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/data/gtfs"

TGSRTC_URL="https://data.opencity.in/dataset/88e2d145-7ec6-4666-88dd-6cf18b18312e/resource/1b0d18bb-b2fb-4a79-8ed0-1e071da5790c/download/telangana_opendata_gtfs_tgsrtc_08_february_2026.zip"

echo "→ Downloading TGSRTC GTFS…"
curl -fL "$TGSRTC_URL" -o "$ROOT/data/gtfs/tgsrtc.zip"
echo "✓ Saved data/gtfs/tgsrtc.zip"

echo ""
echo "HMRL GTFS is manual:"
echo "  1. Open https://data.opencity.in/dataset/hyderabad-metro-rail-gtfs"
echo "  2. Download the GTFS zip"
echo "  3. Save as data/gtfs/hmrl.zip"
echo ""
echo "Check licenses of both feeds before public release (SPEC §1.10)."
