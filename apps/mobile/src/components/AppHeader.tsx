import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from './BrandMark';
import { CITIES, getCity, setCity, subscribeCity } from '../api/city';
import { shadows } from '../ui/theme';
import '../i18n';

/** Top bar: logo + Safar + city pill. Used on the tab screens. */
export function AppHeader(): React.JSX.Element {
  const { t } = useTranslation();
  const [city, setCityState] = useState(getCity());
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeCity(setCityState), []);

  return (
    <View style={styles.bar}>
      <BrandMark size={30} />
      <Text style={styles.name}>{t('appName')}</Text>
      <Pressable style={styles.pill} onPress={() => setOpen(true)}>
        <Ionicons name="location-outline" size={15} color="#fff" />
        <Text style={styles.pillText}>{city}</Text>
        <Ionicons name="chevron-down" size={14} color="#fff" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.sheet} onPress={() => setOpen(false)}>
          <View style={[shadows.card, styles.sheetBox]}>
            <Text style={styles.sheetTitle}>{t('changeCity')}</Text>
            {CITIES.map((c) => (
              <Pressable
                key={c.name}
                style={styles.cityRow}
                onPress={() => {
                  if (c.live) {
                    setCity(c.name);
                    setOpen(false);
                  } else {
                    Alert.alert(t('comingSoon'), t('cityLocked'));
                  }
                }}
              >
                <Text style={styles.cityText}>{c.name}</Text>
                {c.live ? (
                  <Ionicons name="checkmark-circle" size={20} color="#0B6E4F" />
                ) : (
                  <Text style={styles.soon}>{t('comingSoon')}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#fff', fontSize: 19, fontWeight: '800' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 2,
  },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sheet: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetBox: { padding: 20, gap: 6, borderRadius: 20, margin: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E3E6EA',
  },
  cityText: { fontWeight: '700', fontSize: 15 },
  soon: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
    color: '#B7791F',
    backgroundColor: '#FFF8E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
