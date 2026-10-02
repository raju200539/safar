import { Link, Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  api,
  getBaseUrl,
  getRecentSearches,
  type RecentSearch,
} from '../src/api/client';
import { fmtDateTime } from '../src/api/format';
import {
  getEndpoints,
  setEndpoint,
  swapEndpoints,
  type Endpoint,
} from '../src/api/endpoints';
import { UiButton } from '../src/ui/UiButton';
import { shadows, theme, type } from '../src/ui/theme';
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
  const [departMode, setDepartMode] = useState<'now' | 'at'>('now');
  const [atTime, setAtTime] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
      choose(
        which,
        {
          name: 'My location',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        },
        'My location',
      );
    } finally {
      setLocating(false);
    }
  };

  const canSearch = from != null && to != null && (departMode === 'now' || atTime != null);

  // "Depart at": today if still ahead, else tomorrow (device timezone).
  const chosenWhen = (): string | undefined => {
    if (departMode === 'now' || !atTime) return undefined;
    const d = new Date();
    d.setHours(atTime.getHours(), atTime.getMinutes(), 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  };

  const atLabel = (): string => {
    if (!atTime) return t('pickTime');
    const h = atTime.getHours().toString().padStart(2, '0');
    const m = atTime.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
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
    <View style={styles.field}>
      <View style={styles.inputRow}>
        <Ionicons
          name={which === 'from' ? 'locate-outline' : 'flag-outline'}
          size={20}
          color={theme.primary}
        />
        <TextInput
          style={styles.input}
          placeholder={t(which === 'from' ? 'fromPlaceholder' : 'toPlaceholder')}
          value={text}
          onChangeText={(s) => {
            setText(s);
            choose(which, null, s);
          }}
        />
        {text.length > 0 ? (
          <Pressable onPress={() => choose(which, null, '')} hitSlop={12}>
            <Ionicons name="close-circle" size={20} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>
      {results.length > 0 ? (
        <View style={styles.suggestBox}>
          {results.map((item) => (
            <Pressable
              key={item.stopId ?? item.name}
              style={styles.suggest}
              onPress={() =>
                choose(
                  which,
                  { name: item.name, lat: item.lat, lon: item.lon },
                  item.name,
                )
              }
            >
              <Ionicons name="bus-outline" size={18} color={theme.primary} />
              <Text style={styles.suggestText}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.miniRow}>
        <UiButton
          title={t('useLocation')}
          variant="secondary"
          onPress={() => void useLocation(which)}
          icon={<Ionicons name="navigate-outline" size={18} color={theme.primaryDark} />}
        />
        <UiButton
          title={t('pinDrop')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/pick', params: { target: which } })}
          icon={<Ionicons name="map-outline" size={18} color={theme.primaryDark} />}
        />
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: t('appName') }} />
      <Text style={type.h1}>{t('planTitle')}</Text>

      <View style={[shadows.card, styles.block]}>
        {field('from', fromText, setFromText, fromResults)}
      </View>
      <View style={styles.swapRow}>
        <Pressable
          style={styles.swap}
          onPress={() => {
            swapEndpoints();
            const ep = getEndpoints();
            setFrom(ep.from);
            setTo(ep.to);
            setFromText(ep.from?.name ?? '');
            setToText(ep.to?.name ?? '');
          }}
        >
          <Ionicons name="swap-vertical" size={22} color="#fff" />
        </Pressable>
      </View>
      <View style={[shadows.card, styles.block]}>
        {field('to', toText, setToText, toResults)}
      </View>

      <View style={[shadows.card, styles.block]}>
        <View style={styles.segRow}>
          <Pressable
            style={[styles.seg, departMode === 'now' && styles.segOn]}
            onPress={() => setDepartMode('now')}
          >
            <Text style={[styles.segText, departMode === 'now' && styles.segTextOn]}>
              {t('departNow')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.seg, departMode === 'at' && styles.segOn]}
            onPress={() => setDepartMode('at')}
          >
            <Text style={[styles.segText, departMode === 'at' && styles.segTextOn]}>
              {t('departAt')}
            </Text>
          </Pressable>
          {departMode === 'at' ? (
            <View style={styles.timeRow}>
              <Pressable style={styles.timeBtn} onPress={() => setPickerOpen(true)}>
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <Text style={styles.timeText}>{atLabel()}</Text>
              </Pressable>
            </View>
          ) : null}
          {pickerOpen ? (
            <DateTimePicker
              value={atTime ?? new Date()}
              mode="time"
              is24Hour
              display="clock"
              onChange={(_e: unknown, d?: Date) => {
                setPickerOpen(false);
                if (d) setAtTime(d);
              }}
            />
          ) : null}
        </View>
      </View>

      {locating ? <ActivityIndicator color={theme.primary} /> : null}
      <UiButton
        title={t('search')}
        disabled={!canSearch}
        onPress={() => router.push({ pathname: '/results', params })}
        icon={<Ionicons name="search-outline" size={20} color="#fff" />}
      />

      {recent.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={type.h2}>{t('recent')}</Text>
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
              asChild
            >
              <Pressable style={[shadows.card, styles.recentCard]}>
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentRoute} numberOfLines={1}>
                    {r.fromName} → {r.toName}
                  </Text>
                  <Text style={type.small}>{fmtDateTime(r.at)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.muted} />
              </Pressable>
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
  block: { padding: 14, gap: 10 },
  field: { gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    fontSize: 16,
    color: theme.text,
  },
  suggestBox: { gap: 2 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  suggestText: { fontSize: 15, color: theme.text },
  miniRow: { flexDirection: 'row', gap: 8 },
  swapRow: { alignItems: 'flex-end', marginVertical: -4 },
  swap: {
    backgroundColor: theme.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seg: {
    paddingHorizontal: 16,
    minHeight: theme.tap,
    borderRadius: 12,
    backgroundColor: '#EDF0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: { backgroundColor: theme.primary },
  segText: { fontWeight: '700', color: theme.muted },
  segTextOn: { color: '#fff' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDF0F3',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: theme.tap,
  },
  timeText: { fontSize: 17, fontWeight: '700', color: theme.text },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  recentRoute: { fontSize: 15, fontWeight: '700', color: theme.text },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E7F2ED',
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  cityText: { fontWeight: '700', color: theme.primaryDark },
  sheet: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetBox: { padding: 20, gap: 6, borderRadius: 20, margin: 12 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  soon: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
    color: theme.warning,
    backgroundColor: theme.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  health: { marginTop: 8, opacity: 0.6 },
  credit: { opacity: 0.5, fontSize: 12 },
});
