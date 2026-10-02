import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from './theme';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

/** Big thumb-friendly button (min 48px), primary/secondary/ghost variants. */
export function UiButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
  icon,
}: Props): React.JSX.Element {
  const base =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
        ? styles.secondary
        : styles.ghost;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        ...styles.base,
        ...base,
        ...(pressed ? styles.pressed : {}),
        ...(disabled ? styles.disabled : {}),
      })}
    >
      {icon}
      <Text style={variant === 'primary' ? styles.labelPrimary : styles.labelDark}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.tap,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: theme.primary },
  secondary: { backgroundColor: '#E7F2ED' },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '700' },
  labelPrimary: { color: '#fff' },
  labelDark: { color: theme.primaryDark },
});
