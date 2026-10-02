import { LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android') {
  const exp = UIManager as unknown as {
    setLayoutAnimationEnabledExperimental?: (b: boolean) => void;
  };
  exp.setLayoutAnimationEnabledExperimental?.(true);
}

/** Smoothly animate the next list/layout change on the native thread. */
export function animateLayout(): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}
