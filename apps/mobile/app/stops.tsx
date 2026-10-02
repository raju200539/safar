import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { api } from '../src/api/client';
import type { Place } from '@hyd/shared';
import { theme } from '../src/ui/theme';
import '../src/i18n';

export default function Stops(): React.JSX.Element {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    let live = true;
    setBusy(true);
    const timer = setTimeout(() => {
      api
        .searchStops(q.trim())
        .then((r) => {
          if (live) setResults(r);
        })
        .catch(() => {
          if (live) setResults([]);
        })
        .finally(() => {
          if (live) setBusy(false);
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  const nearby = async (): Promise<void> => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      const r = await api.nearby(pos.coords.latitude, pos.coords.longitude);
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('stopTitle') }} />
      <TextInput
        style={styles.input}
        placeholder={t('fromPlaceholder')}
        value={q}
        onChangeText={setQ}
      />
      <Button title={t('useLocation')} onPress={() => void nearby()} />
      {busy ? <ActivityIndicator /> : null}
      <FlatList
        data={results ?? []}
        keyExtractor={(p) => p.stopId ?? `${p.lat},${p.lon}`}
        renderItem={({ item }) => (
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
            <Pressable style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.stopId}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8, backgroundColor: theme.bg },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  row: { paddingVertical: 10, borderBottomWidth: 1 },
  name: { fontWeight: '600' },
  sub: { opacity: 0.6 },
});
