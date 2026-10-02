import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/ui/theme';
import { AppHeader } from '../src/components/AppHeader';
import { BrandMark } from '../src/components/BrandMark';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function BootOverlay({ done }: { done: () => void }): React.JSX.Element {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const dot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 1, duration: 1400, useNativeDriver: true }),
    ]);
    anim.start();
    const t = setTimeout(done, 1700);
    return () => {
      anim.stop();
      clearTimeout(t);
    };
  }, [dot, fade, scale, done]);

  const dotX = dot.interpolate({ inputRange: [0, 1], outputRange: [-72, 72] });

  return (
    <Animated.View style={{ ...styles.boot, opacity: fade }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <BrandMark size={168} />
      </Animated.View>
      <Animated.View style={{ ...styles.dot, transform: [{ translateX: dotX }] }} />
      <Text style={styles.word}>Safar</Text>
      <Text style={styles.sub}>Bus & Metro, simplified</Text>
    </Animated.View>
  );
}

export default function Layout(): React.JSX.Element {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    // Our animated overlay takes over immediately; never leave it stuck.
    void SplashScreen.hideAsync().catch(() => undefined);
    const failsafe = setTimeout(() => setBooted(true), 3000);
    return () => clearTimeout(failsafe);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: '#8a94a6',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => <AppHeader />,
            title: 'Plan',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="stops"
          options={{
            headerTitle: () => <AppHeader />,
            title: 'Stops',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bus-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="results" options={{ href: null }} />
        <Tabs.Screen name="itinerary" options={{ href: null }} />
        <Tabs.Screen name="stop" options={{ href: null }} />
        <Tabs.Screen name="pick" options={{ href: null }} />
      </Tabs>
      {booted ? null : <BootOverlay done={() => setBooted(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  word: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
});
