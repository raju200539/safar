import { StyleSheet } from 'react-native';

export const theme = {
  primary: '#0B6E4F',
  primaryDark: '#084f39',
  accent: '#E63946',
  metro: '#7B2CBF',
  bus: '#0B6E4F',
  walk: '#6c757d',
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#1A1D21',
  muted: '#6c757d',
  border: '#E3E6EA',
  live: '#0B6E4F',
  scheduled: '#8a94a6',
  radius: 14,
};

export const shadows = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
