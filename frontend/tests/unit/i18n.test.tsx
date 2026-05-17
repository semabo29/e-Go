import React from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import ca from '@/i18n/locales/ca';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';
import it from '@/i18n/locales/it';
import i18n, {
  APP_LOCALES,
  LOCALE_STORAGE_KEY,
  hydrateLocaleFromStorage,
  setAppLocale,
} from '@/i18n/i18n';
import { I18nLocaleHydrator } from '@/i18n/I18nLocaleHydrator';

function setDeviceLanguage(code: string) {
  (Localization as { getLocales: () => { languageCode: string; regionCode?: string }[] }).getLocales =
    () => [{ languageCode: code, regionCode: 'XX' }];
}

describe('i18n', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setDeviceLanguage('es');
    await i18n.changeLanguage('es');
  });

  test('APP_LOCALES incluye es, ca, en e it', () => {
    expect(APP_LOCALES).toEqual(['es', 'ca', 'en', 'it']);
  });

  test('archivos locale exportan objetos de traducción', () => {
    for (const locale of [es, ca, en, it]) {
      expect(locale.common).toBeDefined();
      expect(locale.language?.menuTitle).toBeTruthy();
    }
  });

  test('hydrateLocaleFromStorage usa es si el idioma del dispositivo no está mapeado', async () => {
    setDeviceLanguage('de');
    await hydrateLocaleFromStorage();
    expect(i18n.language).toMatch(/^es/);
  });

  test('hydrateLocaleFromStorage aplica locale guardado válido', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    await hydrateLocaleFromStorage();
    expect(i18n.language).toMatch(/^en/);
  });

  test('hydrateLocaleFromStorage usa idioma del dispositivo si no hay guardado', async () => {
    setDeviceLanguage('ca');
    await hydrateLocaleFromStorage();
    expect(i18n.language).toMatch(/^ca/);
  });

  test('hydrateLocaleFromStorage usa it del dispositivo', async () => {
    setDeviceLanguage('it');
    await hydrateLocaleFromStorage();
    expect(i18n.language).toMatch(/^it/);
  });

  test('hydrateLocaleFromStorage ignora locale guardado inválido y usa dispositivo', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'xx');
    setDeviceLanguage('en');
    await hydrateLocaleFromStorage();
    expect(i18n.language).toMatch(/^en/);
  });

  test('hydrateLocaleFromStorage cae a es si AsyncStorage falla', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage'));
    await hydrateLocaleFromStorage();
    expect(i18n.language).toMatch(/^es/);
  });

  test('setAppLocale persiste y cambia idioma', async () => {
    await setAppLocale('ca');
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ca');
    expect(i18n.language).toMatch(/^ca/);
  });

  test('traducciones resuelven claves en varios idiomas', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('language.menuTitle')).toBe('Idioma');

    await i18n.changeLanguage('en');
    expect(i18n.t('language.menuTitle')).toBe('Language');

    await i18n.changeLanguage('it');
    expect(i18n.t('language.menuTitle')).toBe('Lingua');
  });
});

describe('I18nLocaleHydrator', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setDeviceLanguage('es');
    await i18n.changeLanguage('es');
  });

  test('hidrata el locale al montar', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');

    const { getByTestId } = render(
      <I18nLocaleHydrator>
        <Text testID="child">ok</Text>
      </I18nLocaleHydrator>
    );

    expect(getByTestId('child')).toBeTruthy();

    await waitFor(() => {
      expect(i18n.language).toMatch(/^en/);
    });
  });
});
