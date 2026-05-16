import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

let mockLocalParams: Record<string, unknown> = {};
const mockSetParams = jest.fn();
const mockPush = jest.fn();
const mockMapViewRef = {
  animateToRegion: jest.fn(),
  fitToCoordinates: jest.fn(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockLocalParams,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getCurrentPositionAsync: () =>
    Promise.resolve({
      coords: { latitude: 41.38, longitude: 2.17 },
    }),
}));

// mock del topBar
jest.mock('@/components/TopBar', () => ({
  __esModule: true,
  default: ({
    searchQuery,
    setSearchQuery,
    searchResults,
    onSelectResult,
    isSearching,
    searchMode,
    onToggleSearchMode,
  }: Record<string, unknown>) => {
    const { TextInput, TouchableOpacity, Text } = require('react-native');
    return (
      <>
        <TouchableOpacity testID="search-mode-toggle" onPress={() => (onToggleSearchMode as () => void)?.()}>
          <Text testID="search-mode-value">{String(searchMode)}</Text>
        </TouchableOpacity>
        <TextInput
          testID="search-input"
          value={searchQuery as string}
          onChangeText={setSearchQuery as (mockText: string) => void}
        />
        {Boolean(searchQuery) && Boolean(isSearching) ? <Text>Buscando…</Text> : null}
        {Boolean(searchQuery) && Array.isArray(searchResults) && (searchResults as unknown[]).length > 0
          ? (searchResults as any[]).map((r: any) => {
              if (r.kind === 'station') {
                const st = r.station;
                return (
                  <TouchableOpacity
                    key={`s-${st.id}`}
                    testID={`result-station-${st.id}`}
                    onPress={() => (onSelectResult as (mockArg: unknown) => void)?.(r)}
                  >
                    <Text>{st.nom}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={`a-${r.placeId}`}
                  testID={`geocode-result-${r.placeId}`}
                  onPress={() => (onSelectResult as (mockArg: unknown) => void)?.(r)}
                >
                  <Text>{r.label}</Text>
                </TouchableOpacity>
              );
            })
          : null}
      </>
    );
  },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(({ children, onPress }: any, ref: any) => {
    React.useImperativeHandle(ref, () => mockMapViewRef);
    return (
      <TouchableOpacity testID="map-view" onPress={onPress}>
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, pinColor }: any) => {
    let testId = 'station-marker';
    if (pinColor === 'blue') testId = 'user-marker';
    else if (pinColor === 'red') testId = 'favorite-station-marker';
    return <TouchableOpacity testID={testId} onPress={() => onPress?.({ stopPropagation: jest.fn() })} />;
  };

  return { MapView, Marker };
});

jest.mock('@/components/FavoriteButton', () => ({
  __esModule: true,
  FavoriteButton: ({ isInitiallyFavorite, onToggle }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="favorite-toggle" onPress={() => onToggle(!isInitiallyFavorite)}>
        <Text>x</Text>
      </TouchableOpacity>
    );
  },
}));

/** Normaliza el primer argumento de `fetch` (string, URL o Request) a string para los mocks. */
function fetchUrlString(input: unknown): string {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

describe('geocodeSearch integration', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseCharging = useCharging as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMapViewRef.animateToRegion.mockClear();
    mockLocalParams = {};

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

    // Carga mínima de la pantalla: favoritos vacíos y lista de estaciones vacía.
    (globalThis.fetch as any) = jest.fn(async (input: unknown) => {
      const u = fetchUrlString(input);
      if (u.includes('/favorites')) return { ok: true, json: async () => [] };
      if (u.includes('/stations') && !u.includes('/search')) {
        return { ok: true, json: async () => [] };
      }
      throw new Error(`Unexpected fetch: ${u}`);
    });
  });

  // se activa el autocomplete cuando se escribe 3 o más caracteres
  test('se llama a /geocode/autocomplete cuando se escribe 3 o más caracteres', async () => {
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock.mockImplementation(async (input: unknown) => {
      const u = fetchUrlString(input);
      if (u.includes('/favorites')) return { ok: true, json: async () => [] };
      if (u.includes('/stations') && !u.includes('/search')) return { ok: true, json: async () => [] };
      if (u.includes('/geocode/autocomplete')) {
        return {
          ok: true,
          json: async () => [
            {
              placeId: 'place_abc',
              label: 'Carrer de Balmes',
              subtitle: 'Barcelona',
              description: 'Carrer de Balmes, Barcelona',
            },
          ],
        };
      }
      throw new Error(`Unexpected fetch: ${u}`);
    });

    const { getByTestId } = render(<InicioScreen />);

    fireEvent.press(getByTestId('search-mode-toggle'));
    await waitFor(() => {
      expect(getByTestId('search-mode-value').props.children).toBe('addresses');
    });

    fireEvent.changeText(getByTestId('search-input'), 'Bal');

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/geocode/autocomplete?'));
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('input='));
      },
      { timeout: 4000 }
    );
  });

  // se llama a /geocode/place cuando se selecciona una dirección
  test('se llama a /geocode/place cuando se selecciona una dirección', async () => {
    const fetchMock = globalThis.fetch as jest.Mock;

    fetchMock.mockImplementation(async (input: unknown) => {
      const u = fetchUrlString(input);
      if (u.includes('/favorites')) return { ok: true, json: async () => [] };
      if (u.includes('/stations') && !u.includes('/search')) return { ok: true, json: async () => [] };
      if (u.includes('/geocode/autocomplete')) {
        return {
          ok: true,
          json: async () => [
            {
              placeId: 'place_xyz',
              label: 'Plaça Catalunya',
              subtitle: 'Barcelona',
              description: 'Plaça Catalunya, Barcelona',
            },
          ],
        };
      }
      if (u.includes('/geocode/place')) {
        expect(u).toContain('placeId=place_xyz');
        return {
          ok: true,
          json: async () => ({ lat: 41.387, lng: 2.17, formattedAddress: 'Plaça Catalunya' }),
        };
      }
      throw new Error(`Unexpected fetch: ${u}`);
    });

    const { getByTestId } = render(<InicioScreen />);

    fireEvent.press(getByTestId('search-mode-toggle'));
    await waitFor(() => expect(getByTestId('search-mode-value').props.children).toBe('addresses'));

    fireEvent.changeText(getByTestId('search-input'), 'Pla');

    await waitFor(() => expect(getByTestId('geocode-result-place_xyz')).toBeTruthy(), { timeout: 4000 });

    fireEvent.press(getByTestId('geocode-result-place_xyz'));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((c) => typeof c[0] === 'string' && (c[0] as string).includes('/geocode/place?'))
      ).toBe(true);
    });

    await waitFor(() => {
      expect(mockMapViewRef.animateToRegion).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 41.387, longitude: 2.17 }),
        1000
      );
    });
  });

  test('alternar modo de búsqueda limpia texto y resultados', async () => {
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock.mockImplementation(async (input: unknown) => {
      const u = fetchUrlString(input);
      if (u.includes('/favorites')) return { ok: true, json: async () => [] };
      if (u.includes('/stations') && !u.includes('/search')) return { ok: true, json: async () => [] };
      if (u.includes('/stations/search?')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              nom: 'Estació Nord',
              latitud: '41.39',
              longitud: '2.15',
              municipi: 'Barcelona',
              adreca: 'Carrer Nord',
              kw: '50',
            },
          ],
        };
      }
      throw new Error(`Unexpected fetch: ${u}`);
    });

    const { getByTestId, queryByTestId } = render(<InicioScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'Est');
    await waitFor(() => expect(getByTestId('result-station-1')).toBeTruthy(), { timeout: 4000 });

    fireEvent.press(getByTestId('search-mode-toggle'));
    await waitFor(() => expect(getByTestId('search-mode-value').props.children).toBe('addresses'));

    expect(getByTestId('search-input').props.value).toBe('');
    expect(queryByTestId('result-station-1')).toBeNull();
  });
});
