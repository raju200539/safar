import { Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/**
 * Explicit back control. Hardware back is unreliable with tab stacks on
 * some devices, so pushed screens use this. `to` forces an exact
 * destination (used by Trip → trip list); otherwise pops history with a
 * home fallback.
 */
export function ScreenBack({ to }: { to?: Href }): React.JSX.Element {
  const router = useRouter();
  return (
    <Pressable
      hitSlop={12}
      onPress={() => {
        if (to) {
          router.replace(to);
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      style={{ paddingRight: 8 }}
    >
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </Pressable>
  );
}
