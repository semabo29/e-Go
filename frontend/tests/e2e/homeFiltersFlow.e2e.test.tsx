/**
 * E2E de flujo UI: Càrrega del mapa amb múltiples filtres -> Petició a l'API filtrada -> Validació de l'estació.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

// Variable per simular múltiples paràmetres (filtres) que rebem per URL
let mockLocalParams: Record<string, unknown> = {};

// --- MOCKS ---
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
  // Fem que el router retorni els nostres filtres simulats
  useLocalSearchParams: () => mockLocalParams,
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getCurrentPositionAsync: () =>
    Promise.resolve({
      coords: { latitude: 41.38, longitude: 2.17 },
    }),
  getLastKnownPositionAsync: () =>
    Promise.resolve({
      coords: { latitude: 41.38, longitude: 2.17 },
    }),
  watchPositionAsync: () => Promise.resolve({ remove: jest.fn() }),
  Accuracy: { High: 4, BestForNavigation: 6 },
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

  const Marker = ({ onPress, testID }: any) => {
    let id = testID || 'station-marker';
    return (
      <TouchableOpacity
        testID={id}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  };

  return { MapView, Marker };
});

// Mock del panell de l'estació: ara imprimeix TOTS els camps rellevants per poder-los testejar
jest.mock('@/components/StationBottomSheet', () => ({
  StationBottomSheet: ({ station }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="station-bottom-sheet">
        <Text>{station.nom}</Text>
        <Text>{station.kw} kW</Text>
        <Text>Corriente: {station.ac_dc}</Text>
        <Text>Conector: {station.tipus_connexio}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/LanguageMenuSelector', () => ({
  LanguageMenuSelector: () => null,
}));

// --- DADES DE PROVA ---
const mockFilteredStation = {
  id: 99,
  nom: 'Estació Multi-Filtre Ultra Ràpida',
  latitud: '41.3901',
  longitud: '2.1540',
  municipi: 'Barcelona',
  adreca: 'Carrer Complex 123',
  kw: '150',          // Compleix minKw=50
  ac_dc: 'DC',        // Compleix ac_dc=DC
  tipus_connexio: 'CCS', // Compleix connectorType=CCS
  operatiu: true,
};

describe('E2E: Flux de Múltiples Filtres al Mapa Principal', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseCharging = useCharging as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // 1. Simulem que venim de la pantalla de filtres amb 3 filtres actius alhora!
    mockLocalParams = {
      minKw: '50',
      ac_dc: 'DC',
      connectorType: 'CCS'
    };

    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@test.com', username: 'e2e' },
      logout: jest.fn(),
      isLoading: false,
    });

    mockUseCharging.mockReturnValue({
      isCharging: false,
      autoStopResult: null,
      clearAutoStopResult: jest.fn(),
    });

    // 2. Interceptem el fetch per comprovar que es fa la petició amb TOTS els filtres
    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/favorites') || href.includes('/skins/')) {
        return { ok: true, json: async () => [] } as Response;
      }

      // Si la URL és de buscar estacions:
      if (href.includes('/stations')) {
        // Comprovem que la URL contingui exactament els 3 filtres
        const containsKw = href.includes('minKw=50');
        const containsAcDc = href.includes('ac_dc=DC');
        const containsConnector = href.includes('connectorType=CCS');

        if (containsKw && containsAcDc && containsConnector) {
          // Si té els 3 filtres, retornem la nostra estació especial
          return { ok: true, json: async () => [mockFilteredStation] } as Response;
        } else {
          // Si falta algun filtre, retornem buit (com faria el backend real)
          return { ok: true, json: async () => [] } as Response;
        }
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;
  });

  test('aplica múltiples filtres des de la URL, fa la petició correcta i valida els detalls a la UI', async () => {
    // Rendereitzem la pantalla principal
    const { getByTestId, findByText, getAllByTestId } = render(<InicioScreen />);

    // Comprovem que es carrega el mapa
    await waitFor(() => {
      expect(getByTestId('home-map-screen')).toBeTruthy();
    });

    // 1. Validem que s'ha fet la trucada a l'API i capturem la URL utilitzada
    const fetchCalls = (globalThis.fetch as jest.Mock).mock.calls;
    const stationsApiCall = fetchCalls.find((call: any) => String(call[0]).includes('/stations'));

    expect(stationsApiCall).toBeDefined();
    const requestUrl = String(stationsApiCall![0]);

    // 2. Comprovem explícitament que la URL del frontend ha muntat bé tots els paràmetres
    expect(requestUrl).toContain('minKw=50');
    expect(requestUrl).toContain('ac_dc=DC');
    expect(requestUrl).toContain('connectorType=CCS');

    // 3. Esperem que es renderitzi el marcador de l'estació al mapa
    await waitFor(() => {
      const markers = getAllByTestId('station-marker');
      expect(markers.length).toBeGreaterThan(0);
    });

    // 4. Cliquem el marcador de l'estació
    const stationMarkers = getAllByTestId('station-marker');
    fireEvent.press(stationMarkers[0]);

    // 5. Comprovem que s'obre el StationBottomSheet
    await waitFor(() => {
      expect(getByTestId('station-bottom-sheet')).toBeTruthy();
    });

    // 6. VALIDACIÓ FINAL: Comprovem que la UI pinta exactament les dades que respecten els filtres
    expect(await findByText('Estació Multi-Filtre Ultra Ràpida')).toBeTruthy();
    expect(await findByText('150 kW')).toBeTruthy(); // Supera el minKw=50
    expect(await findByText('Corriente: DC')).toBeTruthy(); // Compleix ac_dc=DC
    expect(await findByText('Conector: CCS')).toBeTruthy(); // Compleix connectorType=CCS
  });
});