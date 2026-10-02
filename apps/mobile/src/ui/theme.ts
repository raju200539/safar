import { StyleSheet } from 'react-native';

export const theme = {
  primary: '#0B6E4F',
  primaryDark: '#084f39',
  accent: '#E63946',
  metro: '#7B2CBF',
  bus: '#0B6E4F',
  walk: '#6c757d',
  bg: '#F2F4F7',
  card: '#FFFFFF',
  text: '#14181D',
  muted: '#6c757d',
  border: '#E3E6EA',
  live: '#0B6E4F',
  scheduled: '#8a94a6',
  warning: '#B7791F',
  warningBg: '#FFF8E6',
  radius: 16,
  tap: 48,
};

export const shadows = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});

export const type = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: theme.text },
  h2: { fontSize: 18, fontWeight: '700', color: theme.text },
  body: { fontSize: 15, color: theme.text },
  small: { fontSize: 13, color: theme.muted },
});
