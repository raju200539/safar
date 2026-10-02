import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Itinerary } from '@hyd/shared';
import { MapView } from '../src/components/MapView';
import '../src/i18n';

export default function ItineraryDetail(): React.JSX.Element {
  const { t } = useTranslation();
  const { data } = useLocalSearchParams<{ data?: string }>();
  let it: Itinerary | null = null;
  try {
    it = data ? (JSON.parse(data) as Itinerary) : null;
  } catch {
    it = null;
  }
  if (!it) {
    return (
      <View style={styles.container}>
        <Text>{t('error')}</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: t('resultsTitle') }} />
      <MapView itinerary={it} />
      {it.legs.map((leg, i) => (
        <View key={`${it?.id}-${i}`} style={styles.leg}>
          <Text style={styles.mode}>
            {leg.mode === 'WALK' ? '🚶' : leg.mode === 'BUS' ? '🚌' : '🚇'} {leg.mode}
            {leg.live ? ` · ${t('live')}` : ''}
          </Text>
          <Text>{leg.instruction}</Text>
          {leg.intermediateStops && leg.intermediateStops.length > 0 ? (
            <Text style={styles.stops}>
              {leg.intermediateStops.map((s) => s.name).join(' · ')}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  leg: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  mode: { fontWeight: '700' },
  stops: { opacity: 0.7 },
});
