import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, api, addRecentSearch } from '../src/api/client';
import { getLastSearch, getSearch, putItinerary, putLastSearch, putSearch } from '../src/api/itinerary-store';
import { fmtTime } from '../src/api/format';
import { EmptyState } from '../src/ui/EmptyState';
import { animateLayout } from '../src/ui/anim';
import { cardBase, theme } from '../src/ui/theme';
import { ScreenBack } from '../src/ui/ScreenBack';
import type { Itinerary } from '@hyd/shared';
import '../src/i18n';

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
    when?: string;
  }>();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'done'; items: Itinerary[] }
  >({ kind: 'loading' });
  const [modeFilter, setModeFilter] = useState<'all' | 'bus' | 'metro'>('all');

  const refTime = p.when ? new Date(p.when) : new Date();
  const refHour = refTime.getHours();
  const metroClosed =
    state.kind === 'done' &&
    state.items.length > 0 &&
    (refHour >= 23 || refHour < 6) &&
    state.items.every((it) => it.legs.every((l) => l.mode !== 'METRO'));

  useEffect(() => {
    let live = true;
    const fromLat = Number(p.fromLat);
    const fromLon = Number(p.fromLon);
    const toLat = Number(p.toLat);
    const toLon = Number(p.toLon);
    putLastSearch({
      fromName: p.fromName ?? '',
      fromLat: p.fromLat ?? '',
      fromLon: p.fromLon ?? '',
      toName: p.toName ?? '',
      toLat: p.toLat ?? '',
      toLon: p.toLon ?? '',
      ...(p.when ? { when: p.when } : {}),
    });
    const key = `${p.fromLat},${p.fromLon}|${p.toLat},${p.toLon}|${p.when ?? ''}|${modeFilter}`;
    const cached = getSearch(key);
    if (cached) setState({ kind: 'done', items: cached });
    else setState({ kind: 'loading' });
    api
      .plan({ fromLat, fromLon, toLat, toLon, when: p.when, modes: modeFilter })
      .then((items) => {
        if (!live) return;
        animateLayout();
        putSearch(key, items);
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
  }, [modeFilter, p.fromLat, p.fromLon, p.toLat, p.toLon, p.when]);

  const fastestDur =
    state.kind === 'done' && state.items.length > 0
      ? Math.min(...state.items.map((x) => x.durationSec))
      : Number.MAX_SAFE_INTEGER;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: t('resultsTitle'), headerLeft: () => <ScreenBack /> }}
      />
      <View style={styles.routeRow}>
        <Ionicons name="locate-outline" size={18} color={theme.primary} />
        <Text style={styles.route} numberOfLines={1}>
          {p.fromName} → {p.toName}
        </Text>
      </View>
      {p.when ? (
        <View style={styles.routeRow}>
          <Ionicons name="time-outline" size={18} color={theme.primary} />
          <Text style={styles.meta}>
            {t('departAt')}: {fmtTime(p.when)}
          </Text>
        </View>
      ) : null}
      <View style={styles.chipRow}>
        {(['all', 'bus', 'metro'] as const).map((m) => (
          <Pressable
            key={m}
            style={modeFilter === m ? styles.chipOn : styles.chipOff}
            onPress={() => setModeFilter(m)}
          >
            <Text style={modeFilter === m ? styles.chipTextOn : styles.chipTextOff}>
              {t(m === 'all' ? 'modeAll' : m === 'bus' ? 'modeBus' : 'modeMetro')}
            </Text>
          </Pressable>
        ))}
      </View>
      {state.kind === 'loading' ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : null}
      {state.kind === 'error' ? (
        <EmptyState title={t('error')} message={state.message} icon="alert" />
      ) : null}
      {state.kind === 'done' && state.items.length === 0 ? (
        <EmptyState title={t('resultsTitle')} message={t('noTrips')} icon="bus" />
      ) : null}
      {state.kind === 'done' && state.items.length === 0 ? (
        <View style={styles.noticeBox}>
          <Ionicons name="time-outline" size={18} color={theme.warning} />
          <Text style={styles.notice}>{t('noTripsHint')}</Text>
        </View>
      ) : null}
      {state.kind === 'done' &&
      state.items.length > 0 &&
      state.items.every((it) => it.transfers >= 2) ? (
        <View style={styles.noticeBox}>
          <Ionicons name="time-outline" size={18} color={theme.warning} />
          <Text style={styles.notice}>{t('limitedService')}</Text>
        </View>
      ) : null}
      {metroClosed ? (
        <View style={styles.noticeBox}>
          <Ionicons name="train-outline" size={18} color={theme.warning} />
          <Text style={styles.notice}>{t('metroClosed')}</Text>
        </View>
      ) : null}
      {state.kind === 'done'
        ? state.items.map((it) => {
            const id = putItinerary(it);
            const longWalk = it.walkDistanceM > 1500;
            const fastest = it.durationSec === fastestDur;
            return (
              <Link key={it.id} href={{ pathname: '/itinerary', params: { id } }} asChild>
                <Pressable style={styles.card}>
                  <View style={styles.topRow}>
                    <Text style={styles.times}>
                      {fmtTime(it.startTime)} – {fmtTime(it.endTime)}
                    </Text>
                    <View style={styles.durPill}>
                      <Text style={styles.dur}>{fmtDur(it.durationSec)}</Text>
                    </View>
                  </View>
                  {fastest ? (
                    <View style={styles.fastRow}>
                      <Ionicons name="flash" size={14} color="#fff" />
                      <Text style={styles.fastText}>{t('fastest')}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.stages}>{stageSummary(it, t('walk'))}</Text>
                  {it.co2SavedKg != null && it.co2SavedKg > 0 ? (
                    <Text style={styles.co2}>
                      {t('co2Saved', { kg: it.co2SavedKg.toFixed(2) })}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Ionicons name="git-compare-outline" size={14} color={theme.muted} />
                    <Text style={styles.meta}>
                      {it.transfers}{' '}
                      {it.transfers === 1 ? t('transfer') : t('transfers')} ·{' '}
                      {Math.round(it.walkDistanceM)} m {t('walk')}
                      {longWalk ? ` · ${t('longWalk')}` : ''}
                    </Text>
                  </View>
                  {it.note ? <Text style={styles.note}>{it.note}</Text> : null}
                </Pressable>
              </Link>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: theme.bg },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  route: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1 },
  noticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.warningBg,
    borderRadius: 12,
    padding: 12,
  },
  notice: { flex: 1, color: theme.text, fontStyle: 'italic' },
  card: { ...cardBase, padding: 16, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  times: { fontSize: 19, fontWeight: '800', color: theme.text, flex: 1 },
  durPill: { backgroundColor: '#E7F2ED', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  dur: { fontSize: 14, fontWeight: '700', color: theme.primaryDark },
  fastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fastText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stages: { fontSize: 14, color: theme.text },
  co2: { fontSize: 13, fontWeight: '600', color: theme.live },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 13, color: theme.muted },
  note: { fontSize: 13, color: theme.warning, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipOff: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  chipOn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipTextOff: { color: theme.text, fontWeight: '700' },
  chipTextOn: { color: '#fff', fontWeight: '700' },
});
