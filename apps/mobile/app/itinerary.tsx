import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Itinerary, Leg } from '@hyd/shared';
import { getItinerary, getLastSearch } from '../src/api/itinerary-store';
import { buildSteps } from '../src/api/steps';
import { fmtTime } from '../src/api/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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

function modeColor(mode: Leg['mode']): string {
  if (mode === 'BUS') return theme.bus;
  if (mode === 'METRO') return theme.metro;
  return theme.walk;
}

function modeIcon(mode: Leg['mode']): string {
  if (mode === 'BUS') return '🚌';
  if (mode === 'METRO') return '🚇';
  return '🚶';
}

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
  const trip: Itinerary = it;
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
        const st = buildSteps(leg, (k, v) => t(k, v));
        return (
          <View key={`${trip.id}-${i}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={{ ...styles.dotBase, backgroundColor: modeColor(leg.mode) }} />
              {last ? null : <View style={styles.line} />}
            </View>
            <View style={styles.card}>
              <View style={styles.badgeRow}>
                <Text
                style={{ ...styles.badgeBase, backgroundColor: modeColor(leg.mode) }}
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
                  <Text style={styles.stepNum}>{si + 1}</Text>
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
              {leg.mode !== 'WALK' && (leg.fareInr != null || leg.from.platformCode) ? (
                <View style={styles.tagRow}>
                  {leg.fareInr != null ? (
                    <Text style={styles.fare}>{t('fare', { inr: leg.fareInr })}</Text>
                  ) : null}
                  {leg.from.platformCode ? (
                    <Text style={styles.platform}>
                      {t('platform', { n: leg.from.platformCode })}
                    </Text>
                  ) : null}
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
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.primary,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    overflow: 'hidden',
  },
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
  platform: {
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
