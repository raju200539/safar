import { Tabs } from 'expo-router';

export default function Layout(): React.JSX.Element {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Plan' }} />
      <Tabs.Screen name="stops" options={{ title: 'Stops' }} />
      <Tabs.Screen name="results" options={{ href: null }} />
      <Tabs.Screen name="itinerary" options={{ href: null }} />
      <Tabs.Screen name="stop" options={{ href: null }} />
    </Tabs>
  );
}
