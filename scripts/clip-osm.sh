#!/usr/bin/env bash
set -euo pipefail
# M1: clip Geofabrik India Southern-Zone OSM to Hyderabad bbox with osmium.
# Hyderabad bbox (generous, covers city + suburbs):
#   lon 78.15–78.65, lat 17.20–17.65

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/data/osm"

SRC="$ROOT/data/osm/india-southern-zone.osm.pbf"
DST="$ROOT/data/osm/hyderabad.osm.pbf"

if [[ ! -f "$SRC" ]]; then
  echo "Download first:"
  echo "  https://download.geofabrik.de/asia/india/southern-zone.html"
  echo "  save as $SRC"
  exit 1
fi

osmium extract \
  --bbox 78.15,17.20,78.65,17.65 \
  -o "$DST" \
  "$SRC" \
  --overwrite

echo "✓ Wrote $DST"
