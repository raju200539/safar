import { Link, Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import {
  api,
  getBaseUrl,
  getRecentSearches,
  type RecentSearch,
} from '../src/api/client';
import {
  getEndpoints,
  setEndpoint,
  swapEndpoints,
  type Endpoint,
} from '../src/api/endpoints';
import type { HealthStatus, Place } from '@hyd/shared';
import '../src/i18n';

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

  // Re-read shared endpoints when returning from the pin-drop map.
  useFocusEffect(
    useCallback(() => {
      const ep = getEndpoints();
      if (ep.from && ep.from !== from) {
        setFrom(ep.from);
        setFromText(ep.from.name);
      }
      if (ep.to && ep.to !== to) {
        setTo(ep.to);
        setToText(ep.to.name);
      }
    }, [from, to]),
  );

  useEffect(() => {
    api
      .health()
      .then((h: HealthStatus) => setHealth(`${h.status}`))
      .catch(() => setHealth('offline'));
    void getRecentSearches().then(setRecent);
  }, []);

  const choose = (which: 'from' | 'to', ep: Endpoint | null, text: string): void => {
    setEndpoint(which, ep);
    if (which === 'from') {
      setFrom(ep);
      setFromText(text);
    } else {
      setTo(ep);
      setToText(text);
    }
  };

  const useLocation = async (which: 'from' | 'to'): Promise<void> => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      choose(which, {
        name: 'My location',
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      }, 'My location');
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

  const field = (
    which: 'from' | 'to',
    text: string,
    setText: (s: string) => void,
    results: Place[],
  ): React.JSX.Element => (
    <View>
      <TextInput
        style={styles.input}
        placeholder={t(which === 'from' ? 'fromPlaceholder' : 'toPlaceholder')}
        value={text}
        onChangeText={(s) => {
          setText(s);
          choose(which, null, s);
        }}
      />
      {results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(p) => p.stopId ?? p.name}
          renderItem={({ item }) => (
            <Pressable
              style={styles.suggest}
              onPress={() =>
                choose(which, { name: item.name, lat: item.lat, lon: item.lon }, item.name)
              }
            >
              <Text>{item.name}</Text>
            </Pressable>
          )}
        />
      ) : null}
      <View style={styles.row}>
        <Button title={t('useLocation')} onPress={() => void useLocation(which)} />
        <Button
          title={t('pinDrop')}
          onPress={() => router.push({ pathname: '/pick', params: { target: which } })}
        />
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: t('appName') }} />
      <Text style={styles.title}>{t('planTitle')}</Text>

      {field('from', fromText, setFromText, fromResults)}
      <Button
        title={t('swap')}
        onPress={() => {
          swapEndpoints();
          const ep = getEndpoints();
          setFrom(ep.from);
          setTo(ep.to);
          setFromText(ep.from?.name ?? '');
          setToText(ep.to?.name ?? '');
        }}
      />
      {field('to', toText, setToText, toResults)}

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
      <Text style={styles.health}>
        API: {health} ({getBaseUrl()})
      </Text>
      <Text style={styles.credit}>{t('dataCredit')}</Text>
    </ScrollView>
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
  credit: { opacity: 0.5, fontSize: 12 },
});
