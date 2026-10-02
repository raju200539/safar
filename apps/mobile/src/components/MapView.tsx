import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import polyline from '@mapbox/polyline';
import type { Itinerary } from '@hyd/shared';
import { LeafletMap, type Checkpoint, type MapPoint } from './LeafletMap';

// Trip route map (web-based Leaflet, OSM tiles — no keys, no native SDK).
export function MapView({ itinerary }: { itinerary: Itinerary }): React.JSX.Element {
  const { coords, start, end, valid, checkpoints } = useMemo(() => {
    const pts: MapPoint[] = [];
    for (const leg of itinerary.legs) {
      const ends = [
        { latitude: leg.from.lat, longitude: leg.from.lon },
        { latitude: leg.to.lat, longitude: leg.to.lon },
      ];
      if (!leg.geometry) {
        pts.push(...ends);
        continue;
      }
      try {
        const decoded = polyline.decode(leg.geometry);
        let ok = false;
        for (const [lat, lon] of decoded) {
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            pts.push({ latitude: lat, longitude: lon });
            ok = true;
          }
        }
        if (ok) continue;
      } catch {
        // fall through to straight-line fallback
      }
      pts.push(...ends);
    }
    const finite = pts.filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    if (finite.length === 0 || itinerary.legs.length === 0) {
      return {
        coords: [] as MapPoint[],
        start: undefined,
        end: undefined,
        valid: false,
        checkpoints: [] as Checkpoint[],
      };
    }
    // Checkpoints: every board/alight + intermediate stop of transit legs,
    // with consecutive duplicates removed.
    const raw: Checkpoint[] = [];
    for (const leg of itinerary.legs) {
      if (leg.mode === 'WALK') continue;
      raw.push(
        { latitude: leg.from.lat, longitude: leg.from.lon, name: leg.from.name },
        ...(leg.intermediateStops ?? []).map((s) => ({
          latitude: s.lat,
          longitude: s.lon,
          name: s.name,
        })),
        { latitude: leg.to.lat, longitude: leg.to.lon, name: leg.to.name },
      );
    }
    const checkpoints = raw.filter(
      (c, i) =>
        i === 0 ||
        c.latitude !== raw[i - 1]?.latitude ||
        c.longitude !== raw[i - 1]?.longitude,
    );
    const first = itinerary.legs[0];
    const last = itinerary.legs[itinerary.legs.length - 1];
    return {
      coords: finite,
      start: { latitude: first.from.lat, longitude: first.from.lon },
      end: { latitude: last.to.lat, longitude: last.to.lon },
      valid: true,
      checkpoints,
    };
  }, [itinerary]);

  if (!valid) {
    return (
      <View style={styles.box}>
        <Text>Map unavailable for this trip.</Text>
      </View>
    );
  }
  return (
    <LeafletMap mode="route" points={coords} pins={{ start, end }} checkpoints={checkpoints} />
  );
}

const styles = StyleSheet.create({
  box: { height: 260, borderRadius: 16, overflow: 'hidden' },
});
