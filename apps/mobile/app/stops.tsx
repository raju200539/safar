import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api/client';
import { openStopDirections } from '../src/api/navigate';
import { EmptyState } from '../src/ui/EmptyState';
import { UiButton } from '../src/ui/UiButton';
import { cardBase, theme, type } from '../src/ui/theme';
import type { Place } from '@hyd/shared';
import '../src/i18n';

export default function Stops(): React.JSX.Element {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [nearby, setNearby] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [locError, setLocError] = useState(false);

  // Nearest stations load automatically — no action needed.
  useEffect(() => {
    let live = true;
    (async () => {
      setBusy(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (live) setLocError(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const r = await api.nearby(pos.coords.latitude, pos.coords.longitude, 1000);
        if (live) setNearby(r);
      } catch {
        if (live) setLocError(true);
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      api
        .searchStops(q.trim())
        .then((r) => {
          if (live) setResults(r);
        })
        .catch(() => {
          if (live) setResults([]);
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  const stopRow = (item: Place): React.JSX.Element => (
    <View key={item.stopId ?? `${item.lat},${item.lon}`} style={styles.row}>
      <Link
        href={{
          pathname: '/stop',
          params: {
            id: item.stopId,
            name: item.name,
            lat: String(item.lat),
            lon: String(item.lon),
          },
        }}
        asChild
      >
        <Pressable style={styles.main}>
          <Ionicons name="bus-outline" size={22} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            {item.distanceM != null ? (
              <Text style={type.small}>
                {item.distanceM >= 1000
                  ? `${(item.distanceM / 1000).toFixed(1)} km`
                  : `${item.distanceM} m`}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Link>
      <Pressable
        style={styles.nav}
        hitSlop={12}
        onPress={() => void openStopDirections(item.lat, item.lon, item.name)}
      >
        <Ionicons name="navigate" size={22} color={theme.primary} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('stopTitle') }} />
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={20} color={theme.primary} />
        <TextInput
          style={styles.input}
          placeholder={t('fromPlaceholder')}
          value={q}
          onChangeText={setQ}
        />
      </View>
      {q.trim().length >= 2 ? (
        <View style={{ gap: 8 }}>
          {results == null ? (
            <ActivityIndicator color={theme.primary} />
          ) : results.length === 0 ? (
            <EmptyState title={t('stopTitle')} message={t('noDepartures')} icon="bus" />
          ) : (
            results.map(stopRow)
          )}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={type.h2}>{t('nearbyStops')}</Text>
          {busy && nearby == null ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : null}
          {locError && nearby == null ? (
            <EmptyState title={t('stopTitle')} message={t('locationNeeded')} icon="map" />
          ) : null}
          {nearby?.length === 0 ? (
            <EmptyState title={t('stopTitle')} message={t('noDepartures')} icon="bus" />
          ) : null}
          {(nearby ?? []).map(stopRow)}
          <UiButton
            title={t('retry')}
            variant="secondary"
            onPress={() => {
              setNearby(null);
              setLocError(false);
              setBusy(true);
              Location.getCurrentPositionAsync({})
                .then((pos) =>
                  api.nearby(pos.coords.latitude, pos.coords.longitude, 1000),
                )
                .then((r) => {
                  setNearby(r);
                  setBusy(false);
                })
                .catch(() => {
                  setLocError(true);
                  setBusy(false);
                });
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: theme.bg },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, padding: 12, fontSize: 16, color: theme.text },
  row: { ...cardBase, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontWeight: '700', fontSize: 15, color: theme.text },
  nav: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E7F2ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
