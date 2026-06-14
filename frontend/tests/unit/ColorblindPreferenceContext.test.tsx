import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ColorblindPreferenceProvider,
  useColorblindPreference,
} from '@/contexts/ColorblindPreferenceContext';

/** Clave persistente; debe coincidir con ColorblindPreferenceContext. */
const STORAGE_KEY = 'colorblind-friendly-v1';

/** Componente de prueba que muestra el estado del contexto en pantalla. */
function ColorblindProbe() {
  const { colorblindFriendly, isLoaded, setColorblindFriendly } = useColorblindPreference();
  return (
    <>
      <Text testID="is-loaded">{isLoaded ? 'yes' : 'no'}</Text>
      <Text testID="colorblind">{colorblindFriendly ? 'yes' : 'no'}</Text>
      <Pressable testID="btn-on" onPress={() => setColorblindFriendly(true)}>
        <Text>on</Text>
      </Pressable>
      <Pressable testID="btn-off" onPress={() => setColorblindFriendly(false)}>
        <Text>off</Text>
      </Pressable>
    </>
  );
}

describe('ColorblindPreferenceContext (modo accesible / daltonismo)', () => {
  // Aislar cada caso: sin datos previos de otras pruebas.
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // Por defecto el modo accesible está desactivado
  test('sin valor guardado: tras cargar, colorblindFriendly es false y isLoaded pasa a true', async () => {
    const { getByTestId } = render(
      <ColorblindPreferenceProvider>
        <ColorblindProbe />
      </ColorblindPreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    expect(getByTestId('colorblind').props.children).toBe('no');
  });

  // Solo el valor guardado "1" activa el modo
  test('valor "1" en AsyncStorage: tras cargar, colorblindFriendly es true', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '1');

    const { getByTestId } = render(
      <ColorblindPreferenceProvider>
        <ColorblindProbe />
      </ColorblindPreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    expect(getByTestId('colorblind').props.children).toBe('yes');
  });

  // desactivado en disco
  test('valor "0" en AsyncStorage: tras cargar, colorblindFriendly es false', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '0');

    const { getByTestId } = render(
      <ColorblindPreferenceProvider>
        <ColorblindProbe />
      </ColorblindPreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    expect(getByTestId('colorblind').props.children).toBe('no');
  });

  // Cualquier otro texto no debe interpretarse como activado
  test('valor distinto de "1": no activa el modo accesible', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'invalid');

    const { getByTestId } = render(
      <ColorblindPreferenceProvider>
        <ColorblindProbe />
      </ColorblindPreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    expect(getByTestId('colorblind').props.children).toBe('no');
  });

  // setColorblindFriendly(true) debe persistir de inmediato
  test('al activar modo accesible: actualiza estado y guarda "1" en AsyncStorage', async () => {
    const { getByTestId } = render(
      <ColorblindPreferenceProvider>
        <ColorblindProbe />
      </ColorblindPreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').props.children).toBe('yes');
    });

    fireEvent.press(getByTestId('btn-on'));

    await waitFor(() => {
      expect(getByTestId('colorblind').props.children).toBe('yes');
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('1');
    });
  });

  // Al desactivar desde estado activo, se escribe "0"
  test('al desactivar modo accesible: estado false y AsyncStorage guarda "0"', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '1');

    const { getByTestId } = render(
      <ColorblindPreferenceProvider>
        <ColorblindProbe />
      </ColorblindPreferenceProvider>
    );

    await waitFor(() => {
      expect(getByTestId('colorblind').props.children).toBe('yes');
    });

    fireEvent.press(getByTestId('btn-off'));

    await waitFor(() => {
      expect(getByTestId('colorblind').props.children).toBe('no');
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('0');
    });
  });

  // Pantallas fuera del provider no deben romper
  test('useColorblindPreference sin Provider: false, isLoaded true y set no-op', () => {
    const { getByTestId } = render(<ColorblindProbe />);

    expect(getByTestId('colorblind').props.children).toBe('no');
    expect(getByTestId('is-loaded').props.children).toBe('yes');

    fireEvent.press(getByTestId('btn-on'));
    expect(getByTestId('colorblind').props.children).toBe('no');
  });
});
