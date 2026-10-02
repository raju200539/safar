import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapViewNative, { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import type { Itinerary } from '@hyd/shared';

// react-native-maps 1.27 ships class-component typings that TS rejects as
// JSX under React 19 types. Cast once here; behaviour is unaffected.
const MapCompat = MapViewNative as unknown as React.FC<{
  style?: unknown;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  children?: React.ReactNode;
}>;
const PolylineCompat = Polyline as unknown as React.FC<{
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeWidth?: number;
}>;

// react-native-maps 1.27 ships class-component typings that TS rejects as
// JSX under React 19 types. Cast once here; behaviour is unaffected.
const MarkerCompat = Marker as unknown as React.FC<{
  coordinate: { latitude: number; longitude: number };
  title?: string;
  pinColor?: string;
}>;

// Wraps react-native-maps so MapLibre can replace it later (SPEC §2.2).
export function MapView({ itinerary }: { itinerary: Itinerary }): React.JSX.Element {
  const { coords, region } = useMemo(() => {
    const pts: Array<{ latitude: number; longitude: number }> = [];
    for (const leg of itinerary.legs) {
      if (!leg.geometry) {
        pts.push(
          { latitude: leg.from.lat, longitude: leg.from.lon },
          { latitude: leg.to.lat, longitude: leg.to.lon },
        );
        continue;
      }
      try {
        for (const [lat, lon] of polyline.decode(leg.geometry)) {
          pts.push({ latitude: lat, longitude: lon });
        }
      } catch {
        pts.push(
          { latitude: leg.from.lat, longitude: leg.from.lon },
          { latitude: leg.to.lat, longitude: leg.to.lon },
        );
      }
    }
    const lats = pts.map((p) => p.latitude);
    const lons = pts.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      coords: pts,
      region: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLon + maxLon) / 2,
        latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.4),
        longitudeDelta: Math.max(0.02, (maxLon - minLon) * 1.4),
      },
    };
  }, [itinerary]);

  const first = itinerary.legs[0];
  const last = itinerary.legs[itinerary.legs.length - 1];

  return (
    <View style={styles.box}>
      <MapCompat style={styles.map} initialRegion={region}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 260, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
});
