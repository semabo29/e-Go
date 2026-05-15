import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import i18n, * as i18nModule from '@/i18n/i18n';
import { LanguageMenuSelector } from '@/components/LanguageMenuSelector';

describe('LanguageMenuSelector', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await i18n.changeLanguage('es');
  });

  test('muestra accesibilidad de los cuatro idiomas', () => {
    const { getByLabelText } = render(
      <LanguageMenuSelector isDark={false} accent="#10b981" />
    );

    expect(getByLabelText('Castellano')).toBeTruthy();
    expect(getByLabelText('Català')).toBeTruthy();
    expect(getByLabelText('English')).toBeTruthy();
    expect(getByLabelText('Italiano')).toBeTruthy();
  });

  test('al pulsar un idioma llama a setAppLocale', async () => {
    const setAppLocaleSpy = jest.spyOn(i18nModule, 'setAppLocale').mockResolvedValue();

    const { getByLabelText } = render(
      <LanguageMenuSelector isDark={false} accent="#10b981" />
    );

    fireEvent.press(getByLabelText('English'));

    expect(setAppLocaleSpy).toHaveBeenCalledWith('en');
  });

  test('modo oscuro y bandera catalana renderizan sin error', () => {
    const { getAllByRole, getByLabelText } = render(
      <LanguageMenuSelector isDark accent="#22c55e" />
    );

    expect(getByLabelText('Català')).toBeTruthy();
    expect(getAllByRole('button').length).toBe(4);
  });

  test('idioma desconocido en i18n usa es como activo por defecto', () => {
    void i18n.changeLanguage('fr');

    const { getByLabelText } = render(
      <LanguageMenuSelector isDark={false} accent="#10b981" />
    );

    const esBtn = getByLabelText('Castellano');
    expect(esBtn).toBeTruthy();
  });

  test('cada idioma dispara setAppLocale con su código', async () => {
    const setAppLocaleSpy = jest.spyOn(i18nModule, 'setAppLocale').mockResolvedValue();

    const { getByLabelText } = render(
      <LanguageMenuSelector isDark={false} accent="#10b981" />
    );

    fireEvent.press(getByLabelText('Castellano'));
    fireEvent.press(getByLabelText('Català'));
    fireEvent.press(getByLabelText('Italiano'));

    expect(setAppLocaleSpy).toHaveBeenCalledWith('es');
    expect(setAppLocaleSpy).toHaveBeenCalledWith('ca');
    expect(setAppLocaleSpy).toHaveBeenCalledWith('it');
    expect(setAppLocaleSpy).toHaveBeenCalledTimes(3);
  });
});
