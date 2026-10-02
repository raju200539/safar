import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MapViewNative, { Marker } from 'react-native-maps';
import { setEndpoint, type Endpoint } from '../src/api/endpoints';
import '../src/i18n';

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
  onPress?: (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
}>;
const MarkerCompat = Marker as unknown as React.FC<{
  coordinate: { latitude: number; longitude: number };
  title?: string;
  pinColor?: string;
}>;

export default function Pick(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const which = target === 'to' ? 'to' : 'from';
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);

  const confirm = (): void => {
    if (!pin) return;
    const ep: Endpoint = {
      name: `Pinned (${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)})`,
      lat: pin.latitude,
      lon: pin.longitude,
    };
    setEndpoint(which, ep);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t(which === 'to' ? 'toPlaceholder' : 'fromPlaceholder') }} />
      <Text style={styles.hint}>{t('pinHint')}</Text>
      <MapCompat
        style={styles.map}
        initialRegion={{
          latitude: 17.385,
          longitude: 78.486,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
        onPress={(e) => setPin(e.nativeEvent.coordinate)}
      >
        {pin ? <MarkerCompat coordinate={pin} pinColor="red" /> : null}
      </MapCompat>
      <Button title={t('search')} disabled={!pin} onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  hint: { opacity: 0.7 },
  map: { flex: 1, borderRadius: 12 },
});
