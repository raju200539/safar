import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/** Explicit back control for pushed screens (hardware back is unreliable
 * with tab stacks on some devices). Falls back to home when no history. */
export function ScreenBack(): React.JSX.Element {
  const router = useRouter();
  return (
    <Pressable
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      style={{ paddingRight: 8 }}
    >
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </Pressable>
  );
}
