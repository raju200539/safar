import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { setEndpoint, type Endpoint } from '../src/api/endpoints';
import { api } from '../src/api/client';
import { LeafletMap } from '../src/components/LeafletMap';
import { UiButton } from '../src/ui/UiButton';
import { theme, type } from '../src/ui/theme';
import '../src/i18n';

export default function Pick(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const which = target === 'to' ? 'to' : 'from';
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = (): void => {
    if (!pin) return;
    setBusy(true);
    // Snap to the nearest real stop within a short walk so the trip starts
    // as "walk to the station". Otherwise keep the exact pinned point.
    api
      .nearby(pin.latitude, pin.longitude, 300)
      .then((stops) => {
        const s = stops[0];
        const ep: Endpoint =
          s != null
            ? { name: s.name, lat: s.lat, lon: s.lon }
            : {
                name: `Pinned (${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)})`,
                lat: pin.latitude,
                lon: pin.longitude,
              };
        setEndpoint(which, ep);
        router.back();
      })
      .catch(() => {
        setEndpoint(which, {
          name: `Pinned (${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)})`,
          lat: pin.latitude,
          lon: pin.longitude,
        });
        router.back();
      })
      .finally(() => setBusy(false));
  };

  const useMyLocation = async (): Promise<void> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    setPin({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t(which === 'to' ? 'toPlaceholder' : 'fromPlaceholder') }} />
      <Text style={type.body}>{t('pinHint')}</Text>
      <LeafletMap
        mode="pick"
        height={420}
        center={
          pin ?? { latitude: 17.385, longitude: 78.486 }
        }
        onPick={(p) => setPin(p)}
      />
      <UiButton
        title={t('useLocation')}
        variant="secondary"
        onPress={() => void useMyLocation()}
      />
      {busy ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <UiButton title={t('search')} disabled={!pin} onPress={confirm} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: theme.bg },
});
