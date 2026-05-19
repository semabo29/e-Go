/**
 * E2E de flujo UI (Jest + Testing Library): mapa → búsqueda → resultado → panel de estación.
 *
 * ¿Tiene mocks? Sí, parciales. Un E2E “puro” usaría app + backend + mapa reales sin simular nada.
 * Aquí mockeamos lo que Jest no puede ejecutar (mapa nativo, GPS, login) y el fetch HTTP,
 * pero el flujo pasa por TopBar y StationBottomSheet reales (no mock del buscador).
 *
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

let mockLocalParams: Record<string, unknown> = {};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => mockLocalParams,
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getCurrentPositionAsync: () =>
    Promise.resolve({
      coords: { latitude: 41.38, longitude: 2.17 },
    }),
  watchPositionAsync: () => Promise.resolve({ remove: jest.fn() }),
  Accuracy: { High: 4 },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: jest.fn(),
    }));
    return (
      <TouchableOpacity testID="map-view" onPress={onPress}>
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, pinColor }: { onPress?: (e: { stopPropagation: () => void }) => void; pinColor?: string }) => {
    let testId = 'station-marker';
    if (pinColor === 'blue') testId = 'user-marker';
    return (
      <TouchableOpacity
        testID={testId}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  };

  return { MapView, Marker };
});

jest.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

jest.mock('@/components/StationNearbyEventsCarousel', () => ({
  StationNearbyEventsCarousel: () => null,
}));

jest.mock('@/components/ads/GoogleBannerAd', () => ({
  GoogleBannerAd: () => null,
}));

/** Estación ficticia que devolverá el mock de `/stations/search` al buscar «Punt». */
const mockStation = {
  id: 42,
  nom: 'Punt Estació E2E',
  latitud: '41.3901',
  longitud: '2.1540',
  municipi: 'Barcelona',
  adreca: 'Carrer de Test E2E',
  kw: '50',
  ac_dc: 'DC',
  tipus_connexio: 'CCS',
  operatiu: true,
};

/** Avanza el debounce de búsqueda (400 ms en index.tsx) para disparar la petición sin esperar en real. */
async function advanceSearchDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(450);
  });
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('E2E: búsqueda estación → panel', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseCharging = useCharging as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = {};

    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@test.com', username: 'e2e', created_at: '', updated_at: '' },
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

    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/favorites')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/skins/conductor/')) {
        return {
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
          }),
        } as Response;
      }
      if (href.includes('/reviews')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/stations/search?')) {
        return { ok: true, json: async () => [mockStation] } as Response;
      }
      if (href.includes('/stations')) {
        return { ok: true, json: async () => [] } as Response;
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;
  });

  test('buscar punto de carga, elegir resultado y abrir panel de la estación', async () => {
    jest.useFakeTimers();

    // —— Paso 0: montar la pantalla de inicio con usuario autenticado (mock en beforeEach) ——
    const { getByTestId, queryByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('home-map-screen')).toBeTruthy();
    });

    // Aún no hay estación seleccionada: el panel inferior no debe existir.
    expect(queryByTestId('station-bottom-sheet')).toBeNull();

    // —— Paso 1: escribir en el buscador (modo estaciones por defecto) ——
    fireEvent.changeText(getByTestId('topbar-search-input'), 'Punt');
    await advanceSearchDebounce();

    // —— Paso 2: comprobar que aparece el resultado en el desplegable del TopBar ——
    await waitFor(() => {
      expect(getByTestId('search-result-station-42')).toBeTruthy();
    });

    // —— Paso 3: pulsar la fila del resultado → selecciona la estación en el mapa ——
    fireEvent.press(getByTestId('search-result-station-42'));

    // —— Paso 4: debe abrirse el StationBottomSheet con los datos de la estación ——
    await waitFor(() => {
      expect(getByTestId('station-bottom-sheet')).toBeTruthy();
    });

    jest.useRealTimers();
  });
});
