import { useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { theme } from './theme';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

/** Physical button: springs to 0.96 on press-in, back on release. */
export function UiButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
  icon,
}: Props): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = (): void => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const pressOut = (): void => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const base =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
        ? styles.secondary
        : styles.ghost;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
    >
      <Animated.View
        style={{
          ...styles.base,
          ...base,
          transform: [{ scale }],
          ...(disabled ? styles.disabled : {}),
        }}
      >
        {icon}
        <Text style={variant === 'primary' ? styles.labelPrimary : styles.labelDark}>
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = {
  base: {
    minHeight: theme.tap,
    borderRadius: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: theme.primary },
  secondary: { backgroundColor: '#E7F2ED' },
  ghost: { backgroundColor: 'transparent' as const },
  disabled: { opacity: 0.45 },
  labelPrimary: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
  labelDark: { fontSize: 16, fontWeight: '700' as const, color: theme.primaryDark },
};
