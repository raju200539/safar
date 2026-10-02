import { Stack, useLocalSearchParams } from 'expo-router';
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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { api, getDeviceId } from '../src/api/client';
import { openStopDirections } from '../src/api/navigate';
import { UiButton } from '../src/ui/UiButton';
import { EmptyState } from '../src/ui/EmptyState';
import { cardBase, theme, type } from '../src/ui/theme';
import type { Arrival, Report } from '@hyd/shared';
import '../src/i18n';

import { fmtDateTime, fmtTime } from '../src/api/format';

const TYPES = ['NOT_RUNNING', 'DIVERTED', 'OVERCROWDED', 'OTHER'] as const;

export default function Stop(): React.JSX.Element {
  const { t } = useTranslation();
  const { id, name, lat, lon } = useLocalSearchParams<{
    id?: string;
    name?: string;
    lat?: string;
    lon?: string;
  }>();
  const [arrivals, setArrivals] = useState<Arrival[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rtype, setRtype] = useState<string>('NOT_RUNNING');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    Promise.all([api.arrivals(id), api.alerts(id)])
      .then(([a, r]) => {
        setArrivals(a);
        setReports(r);
      })
      .catch(() => setError(t('error')));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (): Promise<void> => {
    if (!id) return;
    try {
      const deviceId = await getDeviceId();
      await api.report(deviceId, {
        type: rtype,
        stopId: id,
        note: note || undefined,
      });
      setSent(true);
      setNote('');
      load();
    } catch {
      setError(t('error'));
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: name ?? t('stopTitle') }} />
      <View style={styles.container}>
        <View style={styles.hero}>
          <Ionicons name="bus-outline" size={30} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{name}</Text>
            <Text style={type.small}>{id}</Text>
          </View>
        </View>
        {lat != null && lon != null ? (
          <UiButton
            title={t('directionsToStop')}
            variant="secondary"
            onPress={() =>
              void openStopDirections(Number(lat), Number(lon), name ?? t('stopTitle'))
            }
            icon={<Ionicons name="navigate-outline" size={18} color={theme.primaryDark} />}
          />
        ) : null}
        {error ? <Text>{error}</Text> : null}
        <Text style={type.h2}>{t('departures')}</Text>
        {arrivals == null ? <ActivityIndicator color={theme.primary} /> : null}
        {arrivals?.length === 0 ? (
          <EmptyState title={t('departures')} message={t('noDepartures')} icon="bus" />
        ) : null}
        {arrivals?.map((a, i) => (
          <View key={`${a.scheduledTime}-${i}`} style={styles.dep}>
            <View style={styles.depTop}>
              <Text style={styles.bus}>
                {a.routeShortName} → {a.headsign}
              </Text>
              <Text
                style={a.source === 'live' ? styles.srcLive : styles.srcSched}
              >
                {a.source === 'live' ? t('live') : t('scheduled')}
              </Text>
            </View>
            <Text style={styles.time}>{fmtTime(a.liveTime ?? a.scheduledTime)}</Text>
          </View>
        ))}
        <Text style={type.h2}>
          {t('reports')} ({reports?.length ?? 0})
        </Text>
        {reports?.length === 0 ? <Text style={type.small}>{t('noReports')}</Text> : null}
        {reports?.map((r) => (
          <Text key={r.id} style={type.small}>
            {r.type} · {fmtDateTime(r.createdAt)}
            {r.note ? ` — ${r.note}` : ''}
          </Text>
        ))}
        <Text style={type.h2}>{t('reportIssue')}</Text>
        <View style={styles.types}>
          {TYPES.map((ty) => (
            <Pressable
              key={ty}
              style={rtype === ty ? styles.chipOn : styles.chipOff}
              onPress={() => setRtype(ty)}
            >
              <Text style={rtype === ty ? styles.chipTextOn : styles.chipTextOff}>
                {t(
                  ty === 'NOT_RUNNING'
                    ? 'reportNotRunning'
                    : ty === 'DIVERTED'
                      ? 'reportDiverted'
                      : ty === 'OVERCROWDED'
                        ? 'reportCrowded'
                        : 'reportOther',
                )}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder={t('reportNote')}
          value={note}
          onChangeText={setNote}
          maxLength={280}
        />
        <UiButton title={t('reportSubmit')} onPress={() => void submit()} />
        {sent ? <Text>{t('reportDone')}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  hero: { ...cardBase, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dep: { ...cardBase, padding: 12, gap: 4 },
  depTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bus: { fontWeight: '700', color: theme.text, flex: 1 },
  srcBase: {
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  srcLive: {
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.live,
    color: '#fff',
  },
  srcSched: {
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EDF0F3',
    color: theme.muted,
  },
  time: { fontSize: 17, fontWeight: '600', color: theme.text },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipOff: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  chipOn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipTextOff: { color: theme.text, fontWeight: '600' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
});
