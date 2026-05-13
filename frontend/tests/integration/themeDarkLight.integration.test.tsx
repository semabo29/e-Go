import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import InicioScreen from '@/app/(tabs)/index';
import { ColorblindPreferenceProvider } from '@/contexts/ColorblindPreferenceContext';
import { ThemePreferenceProvider } from '@/contexts/ThemePreferenceContext';

const THEME_STORAGE_KEY = 'theme-preference-v1';
const COLORBLIND_STORAGE_KEY = 'colorblind-friendly-v1';

const mockUseAuth = jest.fn();
const mockUseCharging = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
const mockGetCurrentPositionAsync = jest.fn(async () => ({
  coords: { latitude: 41.38, longitude: 2.17 },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: () => mockUseCharging(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  getCurrentPositionAsync: () => mockGetCurrentPositionAsync(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: true,
    assets: [],
  })),
}));

jest.mock('react-native-maps-directions', () => () => null);
jest.mock('react-native-maps', () => {
  const { createElement } = require('react');
  function PolylineMock() {
    return createElement('Polyline');
  }
  PolylineMock.displayName = 'PolylineMock';
  return { Polyline: PolylineMock };
});

/** TopBar real está mockeado a null en otros tests del mapa; aquí exponemos el menú para llegar a Tema claro/oscuro. */
jest.mock('@/components/TopBar', () => {
  const { createElement } = require('react');
  const RN = require('react-native');
  function MockTopBar({ onPressMenu }: { onPressMenu: () => void }) {
    return createElement(
      RN.Pressable,
      { testID: 'open-settings-menu', onPress: onPressMenu, accessibilityRole: 'button' },
      createElement(RN.Text, null, 'abrir-menu')
    );
  }
  MockTopBar.displayName = 'MockTopBar';
  return MockTopBar;
});

jest.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(({ children, onPress }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));
    return (
      <TouchableOpacity
        testID="map-view"
        onPress={() =>
          onPress?.({
            nativeEvent: {
              coordinate: { latitude: 41.38, longitude: 2.17 },
            },
          })
        }
      >
        <View>{children}</View>
      </TouchableOpacity>
    );
  });
  MapView.displayName = 'MapViewMock';

  function MarkerMock({ onPress, pinColor }: any) {
    let testID = 'station-marker';
    if (pinColor === 'blue') testID = 'user-marker';
    else if (pinColor === 'red' || pinColor === '#a855f7') testID = 'favorite-station-marker';

    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  }
  MarkerMock.displayName = 'MarkerMock';

  return { MapView, Marker: MarkerMock };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  function MockMaterialIcons({ name }: { name: string }) {
    return createElement(Text, null, name);
  }
  MockMaterialIcons.displayName = 'MockMaterialIcons';
  return MockMaterialIcons;
});

function renderInicioWithThemeProviders() {
  return render(
    <ThemePreferenceProvider>
      <ColorblindPreferenceProvider>
        <InicioScreen />
      </ColorblindPreferenceProvider>
    </ThemePreferenceProvider>
  );
}

function fetchInputToUrlString(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Configuración común de mocks y fetch para pruebas de Inicio (tema y modo accesible). */
async function setupInicioScreenIntegration() {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockGetCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 41.38, longitude: 2.17 },
  });
  mockUseLocalSearchParams.mockReturnValue({});
  mockUseAuth.mockReturnValue({
    user: { id: 12, email: 'user@test.com', username: 'test', created_at: '', updated_at: '' },
    logout: jest.fn(),
    isLoading: false,
  });
  mockUseCharging.mockReturnValue({
    isCharging: false,
    session: null,
    distanceToStation: null,
    elapsedSeconds: 0,
    startChargingSession: jest.fn(),
    updateSessionId: jest.fn(),
    stopChargingSession: jest.fn(),
    cancelChargingSession: jest.fn(),
    autoStopResult: null,
    clearAutoStopResult: jest.fn(),
  });

  const integrationFetch: typeof fetch = async (input) => {
    const url = fetchInputToUrlString(input);
    if (url.includes('/favorites')) {
      return new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/stations')) {
      return new Response(
        JSON.stringify([
          {
            id: 1,
            nom: 'Punt 1',
            latitud: '41.3901',
            longitud: '2.1540',
            municipi: 'Barcelona',
            adreca: 'Carrer de Test',
            kw: '50',
            promotor: 'Ajuntament',
            ac_dc: 'DC',
            tipus_connexio: 'CCS',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  globalThis.fetch = jest.fn(integrationFetch);
}

describe('InicioScreen — tema claro / oscuro (integración)', () => {
  beforeEach(setupInicioScreenIntegration);

  // comprueba que cuando se selecciona modo oscuro, se guarda la configuración 
  test('menú Ajustes: al pulsar Oscuro se guarda el tema oscuro en almacenamiento', async () => {
    const { getByTestId, getByText } = renderInicioWithThemeProviders();

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('open-settings-menu'));
    expect(getByText('Ajustes')).toBeTruthy();
    expect(getByText('Tema')).toBeTruthy();

    fireEvent.press(getByText('Oscuro'));

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
  });

  // si se tenía modo oscuro guardado, se puede volver al modo claro y persistir "light".
  test('menú Ajustes: con tema oscuro precargado, pulsar Claro guarda el tema claro', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { getByTestId, getByText } = renderInicioWithThemeProviders();

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('open-settings-menu'));
    fireEvent.press(getByText('Claro'));

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });
  });

  // alternar dos veces seguidas comprueba que la UI del menú y el contexto siguen respondiendo sin quedar en un estado incoherente.
  test('menú Ajustes: alternar Oscuro y Claro deja el último valor elegido en AsyncStorage', async () => {
    const { getByTestId, getByText } = renderInicioWithThemeProviders();

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('open-settings-menu'));
    fireEvent.press(getByText('Oscuro'));
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    fireEvent.press(getByText('Claro'));
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    fireEvent.press(getByText('Oscuro'));
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
  });
});

// Flujo real en Inicio: menú Ajustes → interruptor "Modo accesible" y clave AsyncStorage compartida con la app.
describe('InicioScreen — modo daltonismo / accesible (integración)', () => {
  beforeEach(setupInicioScreenIntegration);

  // El Switch del menú debe persistir la preferencia como "1" (mismo contrato que el contexto).
  test('menú Ajustes: activar Modo accesible guarda colorblind-friendly-v1 = 1', async () => {
    const { getByTestId, getByText } = renderInicioWithThemeProviders();

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('open-settings-menu'));
    expect(getByText('Daltonismo')).toBeTruthy();

    fireEvent(getByTestId('colorblind-friendly-switch'), 'valueChange', true);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(COLORBLIND_STORAGE_KEY)).toBe('1');
    });
  });

  // Si el usuario ya tenía el modo activo, desactivar debe escribir "0" en almacenamiento.
  test('menú Ajustes: con modo accesible precargado, desactivar el interruptor guarda 0', async () => {
    await AsyncStorage.setItem(COLORBLIND_STORAGE_KEY, '1');

    const { getByTestId } = renderInicioWithThemeProviders();

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('open-settings-menu'));
    fireEvent(getByTestId('colorblind-friendly-switch'), 'valueChange', false);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(COLORBLIND_STORAGE_KEY)).toBe('0');
    });
  });

  // Tras cambiar colores del pin favorito, el mock del mapa sigue exponiendo el mismo testID estable.
  test('tras activar modo accesible, el pin de favorito sigue identificable en el mock del mapa', async () => {
    const { getByTestId, getByText } = renderInicioWithThemeProviders();

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('open-settings-menu'));
    fireEvent(getByTestId('colorblind-friendly-switch'), 'valueChange', true);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(COLORBLIND_STORAGE_KEY)).toBe('1');
    });

    expect(getByText('Ajustes')).toBeTruthy();
    expect(getByTestId('favorite-station-marker')).toBeTruthy();
  });
});
