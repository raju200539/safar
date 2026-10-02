import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { api, getDeviceId } from '../src/api/client';
import { fmtDateTime, fmtTime } from '../src/api/format';
import { openStopDirections } from '../src/api/navigate';
import { shadows, theme } from '../src/ui/theme';
import type { Arrival, Report } from '@hyd/shared';
import '../src/i18n';

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
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: name ?? t('stopTitle') }} />
      {lat != null && lon != null ? (
        <Button
          title={t('directionsToStop')}
          onPress={() => void openStopDirections(Number(lat), Number(lon), name ?? t('stopTitle'))}
        />
      ) : null}
      {error ? <Text>{error}</Text> : null}
      <Text style={styles.h}>{t('departures')}</Text>
      {arrivals == null ? <ActivityIndicator /> : null}
      {arrivals?.length === 0 ? <Text>{t('noDepartures')}</Text> : null}
      {arrivals?.map((a, i) => (
        <View key={`${a.scheduledTime}-${i}`} style={styles.row}>
          <Text style={styles.bus}>
            {a.routeShortName} → {a.headsign}
          </Text>
          <Text>
            {fmtTime(a.liveTime ?? a.scheduledTime)} ·{' '}
            {a.source === 'live' ? t('live') : t('scheduled')}
          </Text>
        </View>
      ))}
      <Text style={styles.h}>
        {t('reports')} ({reports?.length ?? 0})
      </Text>
      {reports?.length === 0 ? <Text>{t('noReports')}</Text> : null}
      {reports?.map((r) => (
        <Text key={r.id}>
          {r.type} · {fmtDateTime(r.createdAt)}
          {r.note ? ` — ${r.note}` : ''}
        </Text>
      ))}
      <Text style={styles.h}>{t('reportIssue')}</Text>
      <View style={styles.types}>
        {TYPES.map((ty) => (
          <Button
            key={ty}
            title={t(
              ty === 'NOT_RUNNING'
                ? 'reportNotRunning'
                : ty === 'DIVERTED'
                  ? 'reportDiverted'
                  : ty === 'OVERCROWDED'
                    ? 'reportCrowded'
                    : 'reportOther',
            )}
            onPress={() => setRtype(ty)}
            color={rtype === ty ? undefined : '#999'}
          />
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder={t('reportNote')}
        value={note}
        onChangeText={setNote}
        maxLength={280}
      />
      <Button title={t('reportSubmit')} onPress={() => void submit()} />
      {sent ? <Text>{t('reportDone')}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, backgroundColor: theme.bg },
  h: { fontSize: 16, fontWeight: '700', marginTop: 8, color: theme.text },
  row: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  bus: { fontWeight: '600', color: theme.text },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
