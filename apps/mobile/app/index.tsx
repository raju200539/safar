import { Link, Stack, useRouter } from 'expo-router';
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
import { api, getRecentSearches, type RecentSearch } from '../src/api/client';
import type { HealthStatus, Place } from '@hyd/shared';
import '../src/i18n';

interface Endpoint {
  name: string;
  lat: number;
  lon: number;
}

function useStopSearch(query: string): Place[] {
  const [results, setResults] = useState<Place[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      api
        .searchStops(query.trim())
        .then((r) => {
          if (live) setResults(r.slice(0, 6));
        })
        .catch(() => {
          if (live) setResults([]);
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);
  return results;
}

export default function Home(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [health, setHealth] = useState('…');
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [from, setFrom] = useState<Endpoint | null>(null);
  const [to, setTo] = useState<Endpoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const fromResults = useStopSearch(from && fromText === from.name ? '' : fromText);
  const toResults = useStopSearch(to && toText === to.name ? '' : toText);

  useEffect(() => {
    api
      .health()
      .then((h: HealthStatus) => setHealth(`${h.status}`))
      .catch(() => setHealth('offline'));
    void getRecentSearches().then(setRecent);
  }, []);

  const useLocation = async (which: 'from' | 'to'): Promise<void> => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      const ep = {
        name: 'My location',
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };
      if (which === 'from') {
        setFrom(ep);
        setFromText(ep.name);
      } else {
        setTo(ep);
        setToText(ep.name);
      }
    } finally {
      setLocating(false);
    }
  };

  const canSearch = from != null && to != null;
  const params = {
    fromName: from?.name ?? '',
    fromLat: String(from?.lat ?? ''),
    fromLon: String(from?.lon ?? ''),
    toName: to?.name ?? '',
    toLat: String(to?.lat ?? ''),
    toLon: String(to?.lon ?? ''),
  };

  const pick = (
    p: Place,
    which: 'from' | 'to',
    setText: (s: string) => void,
    setEp: (e: Endpoint) => void,
  ): void => {
    setEp({ name: p.name, lat: p.lat, lon: p.lon });
    setText(p.name);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('appName') }} />
      <Text style={styles.title}>{t('planTitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('fromPlaceholder')}
        value={fromText}
        onChangeText={(s) => {
          setFromText(s);
          setFrom(null);
        }}
      />
      {fromResults.length > 0 ? (
        <FlatList
          data={fromResults}
          keyExtractor={(p) => p.stopId ?? p.name}
          renderItem={({ item }) => (
            <Pressable
              style={styles.suggest}
              onPress={() => pick(item, 'from', setFromText, setFrom)}
            >
              <Text>{item.name}</Text>
            </Pressable>
          )}
        />
      ) : null}
      <View style={styles.row}>
        <Button title={t('useLocation')} onPress={() => void useLocation('from')} />
        <Button
          title={t('swap')}
          onPress={() => {
            setFrom(to);
            setTo(from);
            setFromText(toText);
            setToText(fromText);
          }}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('toPlaceholder')}
        value={toText}
        onChangeText={(s) => {
          setToText(s);
          setTo(null);
        }}
      />
      {toResults.length > 0 ? (
        <FlatList
          data={toResults}
          keyExtractor={(p) => p.stopId ?? p.name}
          renderItem={({ item }) => (
            <Pressable
              style={styles.suggest}
              onPress={() => pick(item, 'to', setToText, setTo)}
            >
              <Text>{item.name}</Text>
            </Pressable>
          )}
        />
      ) : null}
      <Button title={t('useLocation')} onPress={() => void useLocation('to')} />

      {locating ? <ActivityIndicator /> : null}
      <Button
        title={t('search')}
        disabled={!canSearch}
        onPress={() => router.push({ pathname: '/results', params })}
      />

      {recent.length > 0 ? (
        <View>
          <Text style={styles.sub}>{t('recent')}</Text>
          {recent.slice(0, 3).map((r) => (
            <Link
              key={String(r.at)}
              href={{
                pathname: '/results',
                params: {
                  fromName: r.fromName,
                  fromLat: String(r.fromLat),
                  fromLon: String(r.fromLon),
                  toName: r.toName,
                  toLat: String(r.toLat),
                  toLon: String(r.toLon),
                },
              }}
            >
              <Text>
                {r.fromName} → {r.toName}
              </Text>
            </Link>
          ))}
        </View>
      ) : null}
      <Text style={styles.health}>API: {health}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '600' },
  sub: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  suggest: { padding: 10, borderBottomWidth: 1 },
  row: { flexDirection: 'row', gap: 8 },
  health: { marginTop: 8, opacity: 0.6 },
});
