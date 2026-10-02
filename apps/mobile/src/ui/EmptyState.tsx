import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';

interface Props {
  title: string;
  message: string;
  icon?: 'search' | 'bus' | 'alert' | 'map';
}

/** Friendly empty/error placeholder instead of bare text. */
export function EmptyState({ title, message, icon = 'search' }: Props): React.JSX.Element {
  return (
    <View style={styles.box}>
      <Ionicons name={icon === 'map' ? 'map-outline' : icon === 'bus' ? 'bus-outline' : icon === 'alert' ? 'alert-circle-outline' : 'search-outline'} size={44} color={theme.muted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 8, padding: 28 },
  title: { fontSize: 17, fontWeight: '700', color: theme.text },
  message: { fontSize: 14, color: theme.muted, textAlign: 'center' },
});
