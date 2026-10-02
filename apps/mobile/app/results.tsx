import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError, api, addRecentSearch } from '../src/api/client';
import { putItinerary } from '../src/api/itinerary-store';
import type { Itinerary } from '@hyd/shared';
import '../src/i18n';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDur(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function stageSummary(it: Itinerary, walkLabel: string): string {
  return it.legs
    .map((l) => {
      if (l.mode === 'WALK') {
        const m = Math.round(l.distanceM ?? 0);
        return `🚶 ${m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`} ${walkLabel}`;
      }
      return `${l.mode === 'BUS' ? '🚌' : '🚇'} ${l.route?.shortName ?? ''}`;
    })
    .join('  →  ');
}

export default function Results(): React.JSX.Element {
  const { t } = useTranslation();
  const p = useLocalSearchParams<{
    fromName?: string;
    fromLat?: string;
    fromLon?: string;
    toName?: string;
    toLat?: string;
    toLon?: string;
  }>();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'done'; items: Itinerary[] }
  >({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    const fromLat = Number(p.fromLat);
    const fromLon = Number(p.fromLon);
    const toLat = Number(p.toLat);
    const toLon = Number(p.toLon);
    api
      .plan({ fromLat, fromLon, toLat, toLon })
      .then((items) => {
        if (!live) return;
        setState({ kind: 'done', items });
        void addRecentSearch({
          fromName: p.fromName ?? '',
          fromLat,
          fromLon,
          toName: p.toName ?? '',
          toLat,
          toLon,
          at: Date.now(),
        });
      })
      .catch((e: unknown) => {
        if (!live) return;
        const msg =
          e instanceof ApiError
            ? e.code === 'OUT_OF_AREA'
              ? e.message
              : t('error')
            : t('error');
        setState({ kind: 'error', message: msg });
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('resultsTitle') }} />
      <Text style={styles.route}>
        {p.fromName} → {p.toName}
      </Text>
      {state.kind === 'loading' ? <ActivityIndicator size="large" /> : null}
      {state.kind === 'error' ? <Text>{state.message}</Text> : null}
      {state.kind === 'done' && state.items.length === 0 ? (
        <Text>{t('noTrips')}</Text>
      ) : null}
      {state.kind === 'done'
        ? state.items.map((it) => {
            const id = putItinerary(it);
            const longWalk = it.walkDistanceM > 1500;
            return (
              <Link key={it.id} href={{ pathname: '/itinerary', params: { id } }} asChild>
                <Pressable style={styles.card}>
                  <Text style={styles.times}>
                    {fmtTime(it.startTime)} – {fmtTime(it.endTime)} · {fmtDur(it.durationSec)}
                  </Text>
                  <Text>
                    {it.transfers} {it.transfers === 1 ? t('transfer') : t('transfers')} ·{' '}
                    {Math.round(it.walkDistanceM)} m {t('walk')}
                    {longWalk ? ` · ${t('longWalk')}` : ''}
                  </Text>
                  <Text numberOfLines={3} style={styles.legs}>
                    {stageSummary(it, t('walk'))}
                  </Text>
                </Pressable>
              </Link>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  route: { fontSize: 16, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  times: { fontSize: 17, fontWeight: '700' },
  legs: { opacity: 0.8 },
});
