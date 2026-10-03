import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Itinerary, Leg } from '@hyd/shared';
import { getItinerary, getLastSearch } from '../src/api/itinerary-store';
import { useEffect, useRef, useState } from 'react';
import { api } from '../src/api/client';
import { buildSteps } from '../src/api/steps';
import { fmtTime } from '../src/api/format';
import { Ionicons } from '@expo/vector-icons';
import { Vibration } from 'react-native';
import * as Location from 'expo-location';
import { openTripTransit, openWalkDirections } from '../src/api/navigate';
import { UiButton } from '../src/ui/UiButton';
import { MapView } from '../src/components/MapView';
import { cardBase, theme } from '../src/ui/theme';
import { ScreenBack } from '../src/ui/ScreenBack';
import '../src/i18n';

function StopsToggle({
  stops,
  collapsedLabel,
  expandedLabel,
}: {
  stops: string[];
  collapsedLabel: string;
  expandedLabel: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
        <Text style={styles.toggle}>
          {open ? expandedLabel : collapsedLabel} {open ? '▴' : '▾'}
        </Text>
      </Pressable>
      {open ? <Text style={styles.stops}>{stops.join(' · ')}</Text> : null}
    </View>
  );
}

function totalFare(trip: Itinerary): number {
  return trip.legs.reduce((a, l) => a + (l.fareInr ?? 0), 0);
}

function metroColor(route?: { color?: string }): string {
  const c = (route?.color ?? '').replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(c)) return `#${c.toUpperCase()}`;
  return theme.metro;
}

function modeColor(leg: Leg): string {
  if (leg.mode === 'BUS') return theme.bus;
  if (leg.mode === 'METRO') return metroColor(leg.route);
  return theme.walk;
}

function modeIcon(mode: Leg['mode']): string {
  if (mode === 'BUS') return '🚌';
  if (mode === 'METRO') return '🚇';
  return '🚶';
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/**
 * Foreground trip tracking: watches location while the trip screen is open
 * and fires a local notification when the rider reaches a boarding stop.
 * Pauses when the app is backgrounded (Expo Go limitation) — stated in UI.
 */
function TripTracker({ trip }: { trip: Itinerary }): React.JSX.Element | null {
  const { t } = useTranslation();
  const notified = useRef(new Set<string>());
  const [active, setActive] = useState(false);
  const [alert, setAlert] = useState<{ stop: string; route: string; head: string } | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let live = true;
    (async () => {
      try {
        const locPerm = await Location.requestForegroundPermissionsAsync();
        if (!live || locPerm.status !== 'granted') return;
        setActive(true);
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 25,
            timeInterval: 15000,
          },
          (pos) => {
            const now = Date.now();
            for (const leg of trip.legs) {
              if (leg.mode === 'WALK') continue;
              if (new Date(leg.startTime).getTime() < now - 5 * 60 * 1000) continue;
              const key = `${leg.from.stopId ?? leg.from.name}|${leg.startTime}`;
              if (notified.current.has(key)) continue;
              const d = haversineM(
                pos.coords.latitude,
                pos.coords.longitude,
                leg.from.lat,
                leg.from.lon,
              );
              if (d <= 150) {
                notified.current.add(key);
                Vibration.vibrate([0, 400, 200, 400]);
                setAlert({
                  stop: leg.from.name,
                  route: leg.route?.shortName ?? '',
                  head: leg.headsign ?? '',
                });
              }
            }
          },
        );
      } catch {
        // tracking is best-effort; trip remains fully usable without it
      }
    })();
    return () => {
      live = false;
      sub?.remove();
    };
  }, [trip]);

  return (
    <View>
      {active ? <Text style={{ opacity: 0.6 }}>{t('trackingOn')}</Text> : null}
      {alert ? (
        <View style={trackStyles.alert}>
          <Text style={trackStyles.alertTitle}>
            {t('notifBoard', { stop: alert.stop, route: alert.route, head: alert.head })}
          </Text>
          <Pressable onPress={() => setAlert(null)} hitSlop={12}>
            <Text style={trackStyles.dismiss}>{t('dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const trackStyles = StyleSheet.create({
  alert: {
    backgroundColor: '#0B6E4F',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  alertTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dismiss: { color: '#fff', fontWeight: '700', textDecorationLine: 'underline' },
});

export default function ItineraryDetail(): React.JSX.Element {
  const { t } = useTranslation();
  const { id, data } = useLocalSearchParams<{ id?: string; data?: string }>();
  let it = id ? getItinerary(id) : null;
  if (!it && data) {
    try {
      it = JSON.parse(data) as Itinerary;
    } catch {
      it = null;
    }
  }
  if (!it) {
    return (
      <View style={styles.container}>
        <Text>{t('error')}</Text>
      </View>
    );
  }
  return <TripDetail trip={it} />;
}

function TripDetail({ trip }: { trip: Itinerary }): React.JSX.Element {
  const { t } = useTranslation();
  const [badStops, setBadStops] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    const boardings = trip.legs.filter((l) => l.mode !== 'WALK' && l.from.stopId);
    Promise.all(boardings.map((l) => api.alerts(l.from.stopId as string).catch(() => [])))
      .then((lists) => {
        if (!live) return;
        const bad = boardings
          .filter((_, i) =>
            (lists[i] ?? []).some(
              (r) => r.type === 'NOT_RUNNING' || r.type === 'DIVERTED',
            ),
          )
          .map((l) => l.from.name);
        setBadStops([...new Set(bad)]);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [trip]);
  const last = getLastSearch();
  const backTo = {
    ...(last ?? {
      fromName: trip.legs[0]?.from.name ?? '',
      fromLat: String(trip.legs[0]?.from.lat ?? ''),
      fromLon: String(trip.legs[0]?.from.lon ?? ''),
      toName: trip.legs[trip.legs.length - 1]?.to.name ?? '',
      toLat: String(trip.legs[trip.legs.length - 1]?.to.lat ?? ''),
      toLon: String(trip.legs[trip.legs.length - 1]?.to.lon ?? ''),
    }),
    ...(last?.when ? { when: last.when } : {}),
  };
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: t('resultsTitle'),
          headerLeft: () => <ScreenBack to={{ pathname: '/results', params: backTo }} />,
        }}
      />
      <MapView itinerary={trip} />
      {badStops.length > 0 ? (
        <View style={styles.warnBox}>
          <Text style={styles.warn}>
            {t('tripDisruption', { stops: badStops.join(', ') })}
          </Text>
        </View>
      ) : null}
      <TripTracker trip={trip} />
      <View style={styles.summary}>
        <Text style={styles.summaryRoute} numberOfLines={2}>
          {trip.legs[0]?.from.name} → {trip.legs[trip.legs.length - 1]?.to.name}
        </Text>
        <Text style={styles.summaryTimes}>
          {fmtTime(trip.startTime)} – {fmtTime(trip.endTime)} ·{' '}
          {Math.round(trip.durationSec / 60)} min · {trip.transfers}{' '}
          {trip.transfers === 1 ? t('transfer') : t('transfers')}
        </Text>
        {totalFare(trip) > 0 ? (
          <Text style={styles.summaryFare}>
            {t('totalFare')}: ₹{totalFare(trip)}
          </Text>
        ) : null}
      </View>
      {trip.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.note}>{trip.note}</Text>
        </View>
      ) : null}
      {trip.co2SavedKg != null && trip.co2SavedKg > 0 ? (
        <View style={styles.co2box}>
          <Text style={styles.co2}>{t('co2Saved', { kg: trip.co2SavedKg.toFixed(2) })}</Text>
        </View>
      ) : null}
      {trip.legs.map((leg, i) => {
        const last = i === trip.legs.length - 1;
        const st = buildSteps(leg, (k, v) => t(k, v), trip.legs[i + 1]);
        return (
          <View key={`${trip.id}-${i}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={{ ...styles.dotBase, backgroundColor: modeColor(leg) }} />
              {last ? null : <View style={styles.line} />}
            </View>
            <View style={styles.card}>
              <View style={styles.badgeRow}>
                <Text
                style={{ ...styles.badgeBase, backgroundColor: modeColor(leg) }}
              >
                  {modeIcon(leg.mode)} {leg.mode}
                  {leg.route?.shortName && leg.mode !== 'WALK'
                    ? ` · ${leg.route.shortName}`
                    : ''}
                </Text>
                {leg.live ? <Text style={styles.live}>· {t('live')}</Text> : null}
              </View>
              <Text style={styles.instruction}>{st.title}</Text>
              {st.steps.map((s, si) => (
                <View key={si} style={styles.stepRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
              <Text style={styles.meta}>
                {leg.mode === 'WALK' && leg.distanceM != null
                  ? `${Math.round(leg.distanceM)} m · `
                  : ''}
                {Math.max(1, Math.round(leg.durationSec / 60))} min
              </Text>
              {leg.mode !== 'WALK' ? (
                <Text style={styles.times}>
                  {fmtTime(leg.startTime)} → {fmtTime(leg.endTime)}
                </Text>
              ) : null}
              {leg.mode !== 'WALK' && leg.from.platformCode ? (
                <View style={styles.tagRow}>
                  <Text
                    style={{
                      ...styles.platformBase,
                      backgroundColor:
                        leg.mode === 'METRO' ? metroColor(leg.route) : theme.bus,
                    }}
                  >
                    {t('platform', { n: leg.from.platformCode })}
                  </Text>
                </View>
              ) : null}
              {leg.intermediateStops && leg.intermediateStops.length > 0 ? (
                <StopsToggle
                  stops={leg.intermediateStops.map((s) => s.name)}
                  collapsedLabel={t('stopsBetween', { n: leg.intermediateStops.length })}
                  expandedLabel={t('hideStops')}
                />
              ) : null}
              {leg.mode === 'BUS' ? (
                <Text style={styles.fareNote}>{t('busFareNote')}</Text>
              ) : null}
              {leg.mode === 'WALK' ? (
                <UiButton
                  title={t('navigateWalk')}
                  variant="secondary"
                  onPress={() =>
                    void openWalkDirections(
                      leg.from.lat,
                      leg.from.lon,
                      leg.to.lat,
                      leg.to.lon,
                    )
                  }
                />
              ) : null}
            </View>
          </View>
        );
      })}
      </ScrollView>
      <View style={styles.bottomBar}>
        <UiButton
          title={t('navigateTrip')}
          onPress={() => void openTripTransit(trip)}
          icon={<Ionicons name="navigate" size={20} color="#fff" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  container: { padding: 16, gap: 4, backgroundColor: theme.bg },
  bottomBar: { padding: 16, paddingTop: 8, backgroundColor: theme.bg },
  summary: { ...cardBase, padding: 14, gap: 4 },
  summaryRoute: { fontSize: 17, fontWeight: '800', color: theme.text },
  summaryTimes: { fontSize: 14, fontWeight: '600', color: theme.primaryDark },
  summaryFare: { fontSize: 14, fontWeight: '700', color: theme.primaryDark },
  co2box: { ...cardBase, padding: 12 },
  warnBox: { ...cardBase, padding: 12, backgroundColor: theme.warningBg },
  warn: { color: theme.text, fontWeight: '600' },
  noteBox: { backgroundColor: theme.warningBg },
  note: { color: theme.warning, fontStyle: 'italic' },
  co2: { fontWeight: '700', color: theme.live },
  row: { flexDirection: 'row', gap: 10 },
  rail: { alignItems: 'center', width: 16, paddingTop: 18 },
  dotBase: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, backgroundColor: theme.border, marginTop: 2 },
  card: { ...cardBase, flex: 1, padding: 12, gap: 6, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeBase: {
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  live: { color: theme.live, fontWeight: '700' },
  instruction: { fontSize: 16, fontWeight: '700', color: theme.text },
  stepRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { fontSize: 18, lineHeight: 22, color: theme.primary, fontWeight: '900' },
  stepText: { flex: 1, fontSize: 15, color: theme.text },
  meta: { color: theme.muted },
  times: { fontSize: 16, fontWeight: '700', color: theme.primaryDark },
  tagRow: { flexDirection: 'row', gap: 8 },
  fare: {
    fontWeight: '700',
    color: theme.primaryDark,
    backgroundColor: '#E7F2ED',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  platformBase: {
    fontWeight: '700',
    color: '#fff',
    backgroundColor: theme.metro,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  stops: { color: theme.muted },
  toggle: { color: theme.primary, fontWeight: '700' },
  fareNote: { color: theme.muted, fontStyle: 'italic' },
});
