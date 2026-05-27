/**
 * E2E: seleccionar estación de recarga → reportar incidencia.
 * Incluye simulación del efecto UI del trigger automático (5º reporte Operatiu → estación operativa).
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

let mockLocalParams: Record<string, unknown> = {};

const mockStation = {
  id: 77,
  nom: 'Estació E2E Incidència',
  latitud: '41.3901',
  longitud: '2.1540',
  municipi: 'Barcelona',
  adreca: 'Carrer Incidència 9',
  kw: '50',
  ac_dc: 'DC',
  tipus_connexio: 'CCS',
  operatiu: true,
};

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
    Promise.resolve({ coords: { latitude: 41.38, longitude: 2.17 } }),
  watchPositionAsync: () => Promise.resolve({ remove: jest.fn() }),
  Accuracy: { High: 4 },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
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

  const MapView = React.forwardRef(({ children, onPress }: any, ref: unknown) => {
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

  const Marker = ({ onPress, pinColor }: any) => {
    let testId = 'station-marker';
    if (pinColor === 'red') testId = 'favorite-station-marker';
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

jest.mock('@/components/LanguageMenuSelector', () => ({
  LanguageMenuSelector: () => null,
}));

jest.mock('@/components/ads/GoogleBannerAd', () => ({
  GoogleBannerAd: () => null,
}));

jest.mock('@/components/StationNearbyEventsCarousel', () => ({
  StationNearbyEventsCarousel: () => null,
}));

function stationPayload(operatiu: boolean) {
  return [{ ...mockStation, operatiu }];
}

describe('E2E: Estación de recarga → incidencia', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseCharging = useCharging as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = {};

    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@ego.app', username: 'e2e', created_at: '', updated_at: '' },
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
  });

  function installDefaultFetch(options?: { operatiuAfterIncidencia?: boolean }) {
    let stationsFetchCount = 0;

    globalThis.fetch = jest.fn(async (url: string, reqInit?: RequestInit) => {
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
      if (href.includes('/car?')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/stations') && !href.includes('/search')) {
        stationsFetchCount += 1;
        const operatiu =
          options?.operatiuAfterIncidencia && stationsFetchCount >= 2
            ? true
            : mockStation.operatiu;
        return { ok: true, json: async () => stationPayload(operatiu) } as Response;
      }
      if (href.includes('/incidencias') && reqInit?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 9001 }) } as Response;
      }

      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;
  }

  test('selecciona estación, abre formulario y envía incidencia', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    installDefaultFetch();

    const { getAllByTestId, getByTestId, getByText, getByPlaceholderText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getAllByTestId('station-marker').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByTestId('station-marker')[0]);

    await waitFor(() => {
      expect(getByTestId('station-bottom-sheet')).toBeTruthy();
      expect(getByText('Reportar incidencia')).toBeTruthy();
    });

    fireEvent.press(getByText('Reportar incidencia'));

    expect(getByText('Comentario')).toBeTruthy();
    fireEvent.changeText(getByPlaceholderText('Describe qué ha ocurrido'), 'Conector dañado en prueba E2E');
    fireEvent.press(getByText('Avariat'));
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidencias'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'Incidencia enviada',
        'La incidencia se ha registrado correctamente.'
      );
    });

    alertSpy.mockRestore();
  });

  test('simula efecto del trigger automático (5º Operatiu): estación pasa a operativa en UI', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    globalThis.fetch = jest.fn(async (url: string, reqInit?: RequestInit) => {
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
      if (href.includes('/car?')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/stations') && !href.includes('/search')) {
        // Primera carga: fuera de servicio; tras POST (5º reporte simulado): operativa
        const operatiu = (globalThis as any).__stationsAfterTrigger === true;
        return {
          ok: true,
          json: async () => stationPayload(operatiu),
        } as Response;
      }
      if (href.includes('/incidencias') && reqInit?.method === 'POST') {
        (globalThis as any).__stationsAfterTrigger = true;
        return { ok: true, json: async () => ({ id: 9002 }) } as Response;
      }

      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;

    (globalThis as any).__stationsAfterTrigger = false;
    mockStation.operatiu = false;

    const { getAllByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getAllByTestId('station-marker').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByTestId('station-marker')[0]);

    await waitFor(() => {
      expect(getByText('Reportar incidencia solucionada')).toBeTruthy();
      expect(queryByText('Reportar incidencia')).toBeNull();
    });

    fireEvent.press(getByText('Reportar incidencia solucionada'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Incidencia reportada',
        'Se ha marcado la estación como operativa.'
      );
      expect(getByText('Reportar incidencia')).toBeTruthy();
      expect(queryByText('Reportar incidencia solucionada')).toBeNull();
    });

    mockStation.operatiu = true;
    delete (globalThis as any).__stationsAfterTrigger;
    alertSpy.mockRestore();
  });
});
