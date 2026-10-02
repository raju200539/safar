import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Stop(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Stop' }} />
      <Text>Stop detail lands in M4.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
