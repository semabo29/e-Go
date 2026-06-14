import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from './locales/es';
import ca from './locales/ca';
import en from './locales/en';
import it from './locales/it';

export const LOCALE_STORAGE_KEY = 'e-go-locale';
export const APP_LOCALES = ['es', 'ca', 'en', 'it'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

function deviceDefaultLocale(): AppLocale {
  const code = Localization.getLocales?.()[0]?.languageCode?.toLowerCase();
  if (code === 'ca') return 'ca';
  if (code === 'en') return 'en';
  if (code === 'it') return 'it';
  return 'es';
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: {
      es: { translation: es },
      ca: { translation: ca },
      en: { translation: en },
      it: { translation: it },
    },
    lng: 'es',
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  });
}

export async function hydrateLocaleFromStorage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && APP_LOCALES.includes(stored as AppLocale)) {
      await i18n.changeLanguage(stored);
      return;
    }
    await i18n.changeLanguage(deviceDefaultLocale());
  } catch {
    await i18n.changeLanguage('es');
  }
}

export async function setAppLocale(lng: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
