import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapViewNative, { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import type { Itinerary } from '@hyd/shared';

// react-native-maps 1.27 ships class-component typings that TS rejects as
// JSX under React 19 types. Cast once here; behaviour is unaffected.
// Wraps react-native-maps so MapLibre can replace it later (SPEC §2.2).
const MapCompat = MapViewNative as unknown as React.FC<{
  style?: unknown;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  children?: React.ReactNode;
  onMapReady?: () => void;
  loadingEnabled?: boolean;
}>;
const PolylineCompat = Polyline as unknown as React.FC<{
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeWidth?: number;
}>;
const MarkerCompat = Marker as unknown as React.FC<{
  coordinate: { latitude: number; longitude: number };
  title?: string;
  pinColor?: string;
}>;

const HYDERABAD_FALLBACK = {
  latitude: 17.385,
  longitude: 78.486,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export function MapView({ itinerary }: { itinerary: Itinerary }): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const { coords, region, valid } = useMemo(() => {
    const pts: Array<{ latitude: number; longitude: number }> = [];
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
        if (decoded.length > 0) {
          let ok = false;
          for (const [lat, lon] of decoded) {
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              pts.push({ latitude: lat, longitude: lon });
              ok = true;
            }
          }
          if (ok) continue;
        }
      } catch {
        // fall through to straight-line fallback
      }
      pts.push(...ends);
    }
    const finite = pts.filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    if (finite.length === 0) {
      return { coords: [], region: HYDERABAD_FALLBACK, valid: false };
    }
    const lats = finite.map((p) => p.latitude);
    const lons = finite.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      coords: finite,
      region: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLon + maxLon) / 2,
        latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.4),
        longitudeDelta: Math.max(0.02, (maxLon - minLon) * 1.4),
      },
      valid: true,
    };
  }, [itinerary]);

  if (!valid) {
    return (
      <View style={styles.box}>
        <Text>Map unavailable for this trip.</Text>
      </View>
    );
  }

  const first = itinerary.legs[0];
  const last = itinerary.legs[itinerary.legs.length - 1];

  return (
    <View style={styles.box}>
      <MapCompat
        style={styles.map}
        initialRegion={region}
        loadingEnabled
        onMapReady={() => setReady(true)}
      >
        <PolylineCompat coordinates={coords} strokeWidth={4} />
        {first ? (
          <MarkerCompat
            coordinate={{ latitude: first.from.lat, longitude: first.from.lon }}
            title="Start"
          />
        ) : null}
        {last ? (
          <MarkerCompat
            coordinate={{ latitude: last.to.lat, longitude: last.to.lon }}
            title="Destination"
            pinColor="green"
          />
        ) : null}
      </MapCompat>
      {ready ? null : <Text style={styles.loading}>Loading map…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 260, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  loading: { position: 'absolute', top: 8, left: 8, opacity: 0.7 },
});
