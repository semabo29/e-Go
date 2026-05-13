import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemePreferenceProvider, useThemePreference } from '@/contexts/ThemePreferenceContext';

const STORAGE_KEY = 'theme-preference-v1';

/** Componente de prueba que muestra el estado del contexto en pantalla. */
function ThemeProbe() {
  const { preference, resolvedScheme, isLoaded, setPreference } = useThemePreference();
  return (
    <>
      <Text testID="is-loaded">{isLoaded ? 'yes' : 'no'}</Text>
      <Text testID="preference">{preference}</Text>
      <Text testID="resolved-scheme">{resolvedScheme}</Text>
      <Pressable testID="btn-light" onPress={() => setPreference('light')}>
        <Text>light</Text>
      </Pressable>
      <Pressable testID="btn-dark" onPress={() => setPreference('dark')}>
        <Text>dark</Text>
      </Pressable>
    </>
  );
}

describe('ThemePreferenceContext (modo claro / modo oscuro)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // la app usa modo claro por defecto.
  test('sin valor guardado: tras cargar, preference y resolvedScheme son light (modo claro por defecto)', async () => {
    const { getByTestId } = render(
      <ThemePreferenceProvider>
        <ThemeProbe />
      </ThemePreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    expect(getByTestId('preference').props.children).toBe('light');
    expect(getByTestId('resolved-scheme').props.children).toBe('light');
  });

  // se guarda la configuración del usuario (en caso de que elija modo oscuro)
  test('valor dark en AsyncStorage: tras cargar, preference y resolvedScheme son dark (modo oscuro persistido)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');

    const { getByTestId } = render(
      <ThemePreferenceProvider>
        <ThemeProbe />
      </ThemePreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    expect(getByTestId('preference').props.children).toBe('dark');
    expect(getByTestId('resolved-scheme').props.children).toBe('dark');
  });

  // se mantiene modo claro por defecto si el valor es inválido
  test('valor inválido en AsyncStorage: se mantiene modo claro (light) como respaldo', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'system');

    const { getByTestId } = render(
      <ThemePreferenceProvider>
        <ThemeProbe />
      </ThemePreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    expect(getByTestId('preference').props.children).toBe('light');
    expect(getByTestId('resolved-scheme').props.children).toBe('light');
  });

  // se cambia a modo oscuro si se selecciona en la pantalla 
  test('al elegir modo oscuro: actualiza estado y guarda "dark" en AsyncStorage', async () => {
    const { getByTestId } = render(
      <ThemePreferenceProvider>
        <ThemeProbe />
      </ThemePreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    fireEvent.press(getByTestId('btn-dark'));

    await waitFor(() => {
      expect(getByTestId('preference').props.children).toBe('dark');
    });
    expect(getByTestId('resolved-scheme').props.children).toBe('dark');

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('dark');
    });
  });

  // se puede volver al modo claro si se selecciona en la pantalla 
  test('al volver a modo claro: estado light y AsyncStorage guarda "light"', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');

    const { getByTestId } = render(
      <ThemePreferenceProvider>
        <ThemeProbe />
      </ThemePreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('preference').props.children).toBe('dark');
    });

    fireEvent.press(getByTestId('btn-light'));

    await waitFor(() => {
      expect(getByTestId('preference').props.children).toBe('light');
    });
    expect(getByTestId('resolved-scheme').props.children).toBe('light');

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('light');
    });
  });

  // modo claro por defecto
  test('useThemePreference sin Provider: valores por defecto modo claro y isLoaded true', () => {
    const { getByTestId } = render(<ThemeProbe />);

    expect(getByTestId('preference').props.children).toBe('light');
    expect(getByTestId('resolved-scheme').props.children).toBe('light');
    expect(getByTestId('is-loaded').props.children).toBe('yes');
  });
});
