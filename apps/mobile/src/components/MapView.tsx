import { StyleSheet, Text, View } from 'react-native';

// Wrap react-native-maps so MapLibre can replace it later (SPEC §2.2).
export function MapView(): React.JSX.Element {
  return (
    <View style={styles.box}>
      <Text>Map lands in M4 (polyline + stops).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 200, borderWidth: 1, borderRadius: 8, padding: 12 },
});
