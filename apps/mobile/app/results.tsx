import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Results(): React.JSX.Element {
  const { from, to } = useLocalSearchParams<{ from?: string; to?: string }>();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Results' }} />
      <Text>
        {from} → {to}
      </Text>
      <Text style={styles.note}>Trip results land in M4 (against /v1/plan).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  note: { opacity: 0.6 },
});
