import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiGet } from '../src/api/client';
import type { HealthStatus } from '@hyd/shared';
import { useTranslation } from 'react-i18next';
import '../src/i18n';

export default function Home(): React.JSX.Element {
  const { t } = useTranslation();
  const [health, setHealth] = useState<string>('…');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    apiGet<HealthStatus>('/health')
      .then((h) => setHealth(`${h.status} (otp: ${h.otp}, db: ${h.db})`))
      .catch(() => setHealth('api unreachable'));
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('appName') }} />
      <Text style={styles.title}>{t('planTitle')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('fromPlaceholder')}
        value={from}
        onChangeText={setFrom}
      />
      <TextInput
        style={styles.input}
        placeholder={t('toPlaceholder')}
        value={to}
        onChangeText={setTo}
      />
      <Link href={{ pathname: '/results', params: { from, to } }} asChild>
        <Button title={t('search')} onPress={() => undefined} />
      </Link>
      <Text style={styles.health}>API: {health}</Text>
      <Text style={styles.note}>{t('m0note')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  health: { marginTop: 12 },
  note: { opacity: 0.6 },
});
