import { Link, Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
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
import { shadows, theme } from '../src/ui/theme';
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
  const [departMode, setDepartMode] = useState<'now' | 'at'>('now');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
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

  // "Depart at HH:MM": today if still ahead, else tomorrow (device timezone).
  const chosenWhen = (): string | undefined => {
    if (departMode === 'now') return undefined;
    const h = Number(hour);
    const m = Number(minute);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return undefined;
    }
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  };

  const params = {
    fromName: from?.name ?? '',
    fromLat: String(from?.lat ?? ''),
    fromLon: String(from?.lon ?? ''),
    toName: to?.name ?? '',
    toLat: String(to?.lat ?? ''),
    toLon: String(to?.lon ?? ''),
    ...(chosenWhen() ? { when: chosenWhen() as string } : {}),
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
        <View>
          {results.map((item) => (
            <Pressable
              key={item.stopId ?? item.name}
              style={styles.suggest}
              onPress={() =>
                choose(which, { name: item.name, lat: item.lat, lon: item.lon }, item.name)
              }
            >
              <Text>{item.name}</Text>
            </Pressable>
          ))}
        </View>
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

      <View style={[shadows.card, styles.block]}>
        {field('from', fromText, setFromText, fromResults)}
      </View>
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
      <View style={[shadows.card, styles.block]}>
        {field('to', toText, setToText, toResults)}
      </View>

      {locating ? <ActivityIndicator /> : null}
      <View style={styles.row}>
        <Button
          title={t(departMode === 'now' ? 'departNowOn' : 'departNow')}
          onPress={() => setDepartMode('now')}
        />
        <Button
          title={t('departAt')}
          onPress={() => setDepartMode('at')}
          color={departMode === 'at' ? undefined : '#999'}
        />
        {departMode === 'at' ? (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.time]}
              placeholder="HH"
              value={hour}
              onChangeText={setHour}
              keyboardType="numeric"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.time]}
              placeholder="MM"
              value={minute}
              onChangeText={setMinute}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        ) : null}
      </View>
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
  container: { flexGrow: 1, padding: 16, gap: 10, backgroundColor: theme.bg },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },
  sub: { fontSize: 16, fontWeight: '600', marginTop: 8, color: theme.text },
  block: { padding: 12, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  suggest: { padding: 10, borderBottomWidth: 1, borderColor: theme.border },
  row: { flexDirection: 'row', gap: 8 },
  time: { width: 64 },
  health: { marginTop: 8, opacity: 0.6 },
  credit: { opacity: 0.5, fontSize: 12 },
});
