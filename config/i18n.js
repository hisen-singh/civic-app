import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from '../locales/en.json';
import hi from '../locales/hi.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi }
};

const deviceLanguage = getLocales()[0]?.languageCode || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    },
    compatibilityJSON: 'v3' // Required for React Native Android
  });

export default i18n;
