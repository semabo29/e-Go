import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, test } from '@jest/globals';

import { ThemePreferenceProvider, useThemePreference } from '@/contexts/ThemePreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColorScheme as useColorSchemeWeb } from '@/hooks/use-color-scheme.web';

const STORAGE_KEY = 'theme-preference-v1';

// theme provider para los tests
function withThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemePreferenceProvider>{children}</ThemePreferenceProvider>;
}

describe('useColorScheme (native)', () => {
  beforeEach(async () => {
    // cada test empieza sin preferencia guardada
    await AsyncStorage.clear();
  });

  test('retorna light per defecte quan la preferència ha carregat', async () => {
    const { result } = renderHook(() => useColorScheme(), { wrapper: withThemeProvider });

    // espera a que el contexto termine de leer AsyncStorage
    await waitFor(() => {
      expect(result.current).toBe('light');
    });
  });

  test('retorna dark si AsyncStorage té dark', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useColorScheme(), { wrapper: withThemeProvider });

    await waitFor(() => {
      expect(result.current).toBe('dark');
    });
  });

  test('sense ThemePreferenceProvider retorna light', () => {
    // useThemePreference usa el fallback del contexto
    const { result } = renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
  });

  test('canvia quan setPreference passa a dark', async () => {
    const { result } = renderHook(
      () => ({
        scheme: useColorScheme(),
        setPreference: useThemePreference().setPreference,
      }),
      { wrapper: withThemeProvider }
    );

    await waitFor(() => {
      expect(result.current.scheme).toBe('light');
    });

    // agrupa la actualización de estado para evitar avisos de React.
    act(() => {
      result.current.setPreference('dark');
    });

    await waitFor(() => {
      expect(result.current.scheme).toBe('dark');
    });
  });
});

describe('useColorScheme (.web)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('delega al mateix resolvedScheme que la versió native', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');

    const native = renderHook(() => useColorScheme(), { wrapper: withThemeProvider });
    const web = renderHook(() => useColorSchemeWeb(), { wrapper: withThemeProvider });

    // ambas variantes deben exponer el mismo esquema resuelto
    await waitFor(() => {
      expect(native.result.current).toBe('dark');
      expect(web.result.current).toBe('dark');
    });
  });

  test('sense provider retorna light com la versió native', () => {
    const native = renderHook(() => useColorScheme());
    const web = renderHook(() => useColorSchemeWeb());

    expect(native.result.current).toBe('light');
    expect(web.result.current).toBe('light');
  });
});
