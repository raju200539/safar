import { Stack, useLocalSearchParams } from 'expo-router';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Itinerary, Leg } from '@hyd/shared';
import { getItinerary } from '../src/api/itinerary-store';
import { openWalkDirections } from '../src/api/navigate';
import { MapView } from '../src/components/MapView';
import { cardBase, theme } from '../src/ui/theme';
import '../src/i18n';

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
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: t('resultsTitle') }} />
      <MapView itinerary={trip} />
      {trip.co2SavedKg != null && trip.co2SavedKg > 0 ? (
        <View style={styles.co2box}>
          <Text style={styles.co2}>{t('co2Saved', { kg: trip.co2SavedKg.toFixed(2) })}</Text>
        </View>
      ) : null}
      {trip.legs.map((leg, i) => {
        const last = i === trip.legs.length - 1;
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
              <Text style={styles.instruction}>{leg.instruction}</Text>
              <Text style={styles.meta}>
                {leg.mode === 'WALK' && leg.distanceM != null
                  ? `${Math.round(leg.distanceM)} m · `
                  : ''}
                {Math.max(1, Math.round(leg.durationSec / 60))} min
              </Text>
              {leg.intermediateStops && leg.intermediateStops.length > 0 ? (
                <Text style={styles.stops}>
                  {leg.intermediateStops.map((s) => s.name).join(' · ')}
                </Text>
              ) : null}
              {leg.mode === 'WALK' ? (
                <Button
                  title={t('navigateWalk')}
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
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4, backgroundColor: theme.bg },
  co2box: { ...cardBase, padding: 12 },
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
  instruction: { fontSize: 15, color: theme.text },
  meta: { color: theme.muted },
  stops: { color: theme.muted },
});
