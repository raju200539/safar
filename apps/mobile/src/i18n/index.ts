import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import te from './te.json';

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  // Hermes on Android lacks Intl.PluralRules; v3 format avoids needing it
  // (we don't use plural features).
  compatibilityJSON: 'v3',
  resources: { en: { translation: en }, te: { translation: te } },
});

export default i18n;
