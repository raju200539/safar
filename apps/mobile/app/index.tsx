import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
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
  loadApiBaseUrl,
  setApiBaseUrl,
  getRecentSearches,
  type RecentSearch,
} from '../src/api/client';
import {
  getEndpoints,
  setEndpoint,
  swapEndpoints,
  type Endpoint,
} from '../src/api/endpoints';
import { LeafletMap, type StopPin } from '../src/components/LeafletMap';
import { BUILD_NUMBER } from '../src/ui/build';
import { UiButton } from '../src/ui/UiButton';
import { cardBase, theme, type } from '../src/ui/theme';
import { animateLayout } from '../src/ui/anim';
import type { HealthStatus, Place } from '@hyd/shared';
import '../src/i18n';

function usePlaceSearch(
  query: string,
  near?: { latitude: number; longitude: number } | null,
): Place[] {
  const [results, setResults] = useState<Place[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      api
        .searchPlaces(query.trim())
        .then((r) => {
          if (!live) return;
          const sorted = [...r].sort((a, b) => {
            // Stops first, then nearest-first so suggestions feel local.
            if ((a.kind ?? 'stop') !== (b.kind ?? 'stop')) {
              return (a.kind ?? 'stop') === 'stop' ? -1 : 1;
            }
            if (!near) return 0;
            return (
              haversineM(near.latitude, near.longitude, a.lat, a.lon) -
              haversineM(near.latitude, near.longitude, b.lat, b.lon)
            );
          });
          animateLayout();
          setResults(sorted.slice(0, 8));
        })
        .catch(() => {
          if (live) setResults([]);
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, near?.latitude, near?.longitude]);
  return results;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export default function Home(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [health, setHealth] = useState('…');
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [from, setFrom] = useState<Endpoint | null>(null);
  const [to, setTo] = useState<Endpoint | null>(null);
  const [destOpen, setDestOpen] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [nearby, setNearby] = useState<StopPin[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [departMode, setDepartMode] = useState<'now' | 'at'>('now');
  const [atTime, setAtTime] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [serverEdit, setServerEdit] = useState(false);
  const [serverText, setServerText] = useState('');
  const [serverMsg, setServerMsg] = useState('');
  const destResults = usePlaceSearch(to && destQuery === to.name ? '' : destQuery, userLoc);

  // Start = current location, preselected like Uber/Rapido.
  useEffect(() => {
    let live = true;
    void loadApiBaseUrl().then(() => {
      if (live) setServerText(getBaseUrl());
    });
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!live) return;
        const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLoc(here);
        const ep = { name: t('myLocation'), lat: here.latitude, lon: here.longitude };
        setFrom(ep);
        setEndpoint('from', ep);
        const stops = await api.nearby(here.latitude, here.longitude, 1000);
        if (!live) return;
        setNearby(
          stops.slice(0, 12).map((s) => ({
            latitude: s.lat,
            longitude: s.lon,
            stopId: s.stopId,
            name: s.name,
          })),
        );
      } catch {
        // location off: rider picks start manually via pin drop
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Re-read shared endpoints when returning from the pin-drop map.
  useFocusEffect(
    useCallback(() => {
      const ep = getEndpoints();
      if (ep.from && ep.from !== from) setFrom(ep.from);
      if (ep.to && ep.to !== to) {
        setTo(ep.to);
      }
      api
        .health()
        .then((h: HealthStatus) => setHealth(`${h.status}`))
        .catch(() => setHealth('offline'));
      void getRecentSearches().then(setRecent);
    }, [from, to]),
  );

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

  const go = (): void => {
    if (!from || !to) return;
    router.push({
      pathname: '/results',
      params: {
        fromName: from.name,
        fromLat: String(from.lat),
        fromLon: String(from.lon),
        toName: to.name,
        toLat: String(to.lat),
        toLon: String(to.lon),
        ...(chosenWhen() ? { when: chosenWhen() as string } : {}),
      },
    });
  };

  const pickDestination = (p: Place): void => {
    const ep = { name: p.name, lat: p.lat, lon: p.lon };
    setTo(ep);
    setEndpoint('to', ep);
    setDestOpen(false);
    setDestQuery('');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('appName') }} />
      <View style={styles.mapBox}>
        <LeafletMap
          mode="browse"
          height={340}
          center={userLoc ?? undefined}
          user={userLoc}
          stops={nearby}
          onStopPress={(stopId) => {
            const s = nearby.find((n) => n.stopId === stopId);
            router.push({
              pathname: '/stop',
              params: { id: stopId, name: s?.name ?? '', lat: '', lon: '' },
            });
          }}
        />
      </View>

      <View style={styles.sheet}>
        <View style={styles.fromRow}>
          <Ionicons name="locate-outline" size={18} color={theme.primary} />
          <Text style={styles.fromText} numberOfLines={1}>
            {from?.name ?? t('locating')}
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: '/pick', params: { target: 'from' } })}
            hitSlop={12}
          >
            <Text style={styles.link}>{t('change')}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.where} onPress={() => setDestOpen(true)}>
          <Ionicons name="search-outline" size={20} color={theme.primary} />
          <Text style={to ? styles.whereText : styles.wherePlaceholder} numberOfLines={1}>
            {to?.name ?? t('whereTo')}
          </Text>
        </Pressable>
        <View style={styles.segRow}>
          <Pressable
            style={departMode === 'now' ? styles.segOn : styles.segOff}
            onPress={() => setDepartMode('now')}
          >
            <Text style={departMode === 'now' ? styles.segTextOn : styles.segTextOff}>
              {t('departNow')}
            </Text>
          </Pressable>
          <Pressable
            style={departMode === 'at' ? styles.segOn : styles.segOff}
            onPress={() => setDepartMode('at')}
          >
            <Text style={departMode === 'at' ? styles.segTextOn : styles.segTextOff}>
              {t('departAt')}
            </Text>
          </Pressable>
          {departMode === 'at' ? (
            <Pressable style={styles.timeBtn} onPress={() => setPickerOpen(true)}>
              <Ionicons name="time-outline" size={20} color={theme.primary} />
              <Text style={styles.timeText}>{atLabel()}</Text>
            </Pressable>
          ) : null}
        </View>
        {pickerOpen ? (
          <DateTimePicker
            value={atTime ?? new Date()}
            mode="time"
            is24Hour
            display="clock"
            onValueChange={(_e: unknown, d?: Date) => {
              setPickerOpen(false);
              if (d) setAtTime(d);
            }}
            onDismiss={() => setPickerOpen(false)}
          />
        ) : null}
        <UiButton
          title={
            canSearch && chosenWhen()
              ? `${t('search')} · ${atLabel()}`
              : canSearch
                ? `${t('search')} · ${t('departNow')}`
                : t('search')
          }
          disabled={!canSearch}
          onPress={go}
          icon={<Ionicons name="search-outline" size={20} color="#fff" />}
        />
        {recent.length > 0 ? (
          <View style={styles.recents}>
            {recent.slice(0, 2).map((r) => (
              <Pressable
                key={String(r.at)}
                style={styles.recentCard}
                onPress={() => {
                  setEndpoint('from', {
                    name: r.fromName,
                    lat: r.fromLat,
                    lon: r.fromLon,
                  });
                  setFrom({ name: r.fromName, lat: r.fromLat, lon: r.fromLon });
                  const ep = { name: r.toName, lat: r.toLat, lon: r.toLon };
                  setTo(ep);
                  setEndpoint('to', ep);
                  router.push({
                    pathname: '/results',
                    params: {
                      fromName: r.fromName,
                      fromLat: String(r.fromLat),
                      fromLon: String(r.fromLon),
                      toName: r.toName,
                      toLat: String(r.toLat),
                      toLon: String(r.toLon),
                      ...(chosenWhen() ? { when: chosenWhen() as string } : {}),
                    },
                  });
                }}
              >
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentRoute} numberOfLines={1}>
                    {r.fromName} → {r.toName}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={styles.health}>
          API: {health} ({getBaseUrl()})
        </Text>
        {serverEdit ? (
          <View style={styles.serverBox}>
            <TextInput
              style={styles.input}
              value={serverText}
              onChangeText={(s) => {
                setServerText(s);
                setServerMsg('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://your-server.example.com"
            />
            <UiButton
              title={t('saveServer')}
              variant="secondary"
              onPress={() =>
                void (async () => {
                  const ok = await setApiBaseUrl(serverText);
                  if (!ok) {
                    setServerMsg(t('badServerUrl'));
                    return;
                  }
                  setServerEdit(false);
                  setHealth('…');
                  try {
                    const h = await api.health();
                    setHealth(`${h.status}`);
                    setServerMsg('');
                  } catch {
                    setHealth('offline');
                    setServerMsg(t('serverUnreachable'));
                  }
                })()
              }
            />
            {serverMsg ? <Text style={styles.serverMsg}>{serverMsg}</Text> : null}
          </View>
        ) : (
          <Pressable onPress={() => setServerEdit(true)} hitSlop={8}>
            <Text style={styles.link}>{t('changeServer')}</Text>
          </Pressable>
        )}
        <Text style={styles.credit}>{t('dataCredit')}</Text>
        <Text style={styles.credit}>build {BUILD_NUMBER}</Text>
      </View>

      <Modal visible={destOpen} animationType="slide" transparent>
        <Pressable style={styles.sheetBg} onPress={() => setDestOpen(false)}>
          <View style={styles.sheetBox}>
            <Text style={type.h2}>{t('whereTo')}</Text>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={20} color={theme.primary} />
              <TextInput
                style={styles.input}
                placeholder={t('toPlaceholder')}
                value={destQuery}
                onChangeText={setDestQuery}
                autoFocus
              />
            </View>
            {destResults.length > 0 ? (
              <View style={styles.suggestBox}>
                {destResults.map((item) => (
                  <Pressable
                    key={item.stopId ?? `${item.lat},${item.lon}`}
                    style={styles.suggest}
                    onPress={() => pickDestination(item)}
                  >
                    <Ionicons
                      name={item.kind === 'place' ? 'location-outline' : 'bus-outline'}
                      size={18}
                      color={theme.primary}
                    />
                    <Text style={styles.suggestText}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <UiButton
              title={t('pinDrop')}
              variant="secondary"
              onPress={() => {
                setDestOpen(false);
                router.push({ pathname: '/pick', params: { target: 'to' } });
              }}
              icon={<Ionicons name="map-outline" size={18} color={theme.primaryDark} />}
            />
            <UiButton
              title={t('swap')}
              variant="ghost"
              onPress={() => {
                swapEndpoints();
                const ep = getEndpoints();
                setFrom(ep.from);
                setTo(ep.to);
                setDestOpen(false);
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  mapBox: { height: 340 },
  sheet: {
    flex: 1,
    gap: 10,
    padding: 16,
    marginTop: -24,
    backgroundColor: theme.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fromText: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.text },
  link: { color: theme.primary, fontWeight: '700' },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    minHeight: 56,
  },
  whereText: { fontSize: 17, fontWeight: '700', color: theme.text, flex: 1 },
  wherePlaceholder: { fontSize: 17, color: theme.muted, flex: 1 },
  segRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segOn: {
    paddingHorizontal: 16,
    minHeight: theme.tap,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
  segOff: {
    paddingHorizontal: 16,
    minHeight: theme.tap,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF0F3',
  },
  segTextOn: { fontWeight: '700', color: '#fff' },
  segTextOff: { fontWeight: '700', color: theme.muted },
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
  recents: { gap: 8 },
  recentCard: {
    ...cardBase,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  recentRoute: { fontSize: 15, fontWeight: '700', color: theme.text },
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
  suggestBox: { gap: 2, maxHeight: 320 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  suggestText: { fontSize: 15, color: theme.text, flex: 1 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetBox: { ...cardBase, padding: 20, gap: 10, margin: 12, maxHeight: '80%' },
  health: { opacity: 0.6 },
  serverBox: { gap: 8 },
  serverMsg: { color: theme.warning },
  credit: { opacity: 0.5, fontSize: 12 },
});
