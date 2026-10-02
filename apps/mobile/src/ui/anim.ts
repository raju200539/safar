import { LayoutAnimation } from 'react-native';

/** Smoothly animate the next list/layout change on the native thread. */
export function animateLayout(): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}
