import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TouchableOpacity, Text, TextInput } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

let mockLocalParams: Record<string, any> = {};
let mockSetParams = jest.fn();
let mockPush = jest.fn();

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

// Simplified TopBar: exposes a real TextInput so we can drive the search flow.
jest.mock('@/components/TopBar', () => ({
  __esModule: true,
  default: ({
    searchQuery,
    setSearchQuery,
    searchResults,
    onSelectResult,
    isSearching,
  }: any) => {
    const { TextInput, TouchableOpacity, Text } = require('react-native');
    return (
      <>
        <TextInput
          testID="search-input"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="search"
        />

        {searchQuery.length > 0 && isSearching ? <Text>Buscando…</Text> : null}

        {searchQuery.length > 0 && searchResults.length > 0 ? (
          <>
            {searchResults.map((r: any) => {
              const station = r.kind === 'station' ? r.station : null;
              if (!station) return null;
              return (
                <TouchableOpacity
                  key={station.id}
                  testID={`result-${station.id}`}
                  onPress={() => onSelectResult?.(r)}
                >
                  <Text>{station.nom}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : null}
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
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));
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

// Mock FavoriteButton so we can toggle favorites from inside the map panel.
jest.mock('@/components/FavoriteButton', () => ({
  __esModule: true,
  FavoriteButton: ({ isInitiallyFavorite, onToggle }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="favorite-toggle" onPress={() => onToggle(!isInitiallyFavorite)}>
        <Text>{isInitiallyFavorite ? 'favorite' : 'favorite-border'}</Text>
      </TouchableOpacity>
    );
  },
}));

describe('InicioScreen integration: search/filter + map favorites', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseCharging = useCharging as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSetParams = jest.fn();
    mockPush = jest.fn();

    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      // favorites load for favoriteIds state
      if (url.includes('/favorites')) {
        return {
          ok: true,
          json: async () => [],
        };
      }

      // stations load for map markers
      if (url.includes('/stations/search?')) {
        return {
          ok: true,
          json: async () => [],
        };
      }

      if (url.includes('/stations')) {
        return {
          ok: true,
          json: async () => [],
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

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

    mockLocalParams = {};
  });

  // Busca por nombre y verifica que se construye correctamente la URL
  test('search by name uses q + filters in /stations/search URL', async () => {
    mockLocalParams = {
      minKw: '20',
      maxKw: '40',
      connectorType: 'CCS Combo2',
      ac_dc: 'DC',
    };

    // Favorites not relevant here; map/search is driven by /stations/search.
    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) {
        return { ok: true, json: async () => [{ id: 1 }] };
      }
      if (url.includes('/stations/search?')) {
        // Assert URL construction for filters.
        expect(url).toContain('q=Punt');
        expect(url).toContain('minKw=20');
        expect(url).toContain('maxKw=40');
        expect(url).toContain('connectorType=CCS%20Combo2');
        expect(url).toContain('ac_dc=DC');

        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              nom: 'Punt Estació',
              latitud: '41.39',
              longitud: '2.15',
              municipi: 'Barcelona',
              adreca: 'Carrer Test',
              kw: '50',
              ac_dc: 'DC',
              tipus_connexio: 'CCS Combo2',
            },
          ],
        };
      }
      if (url.includes('/stations')) {
        return { ok: true, json: async () => [] };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { getByTestId } = render(<InicioScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'Punt');

    await waitFor(() => {
      expect((globalThis.fetch as any) as jest.Mock).toHaveBeenCalledWith(expect.stringContaining('/stations/search?'));
    }, { timeout: 4000 });
  });

  // al seleccionar un resultado del buscador, se abre el panel de informacion de la estacion.
  test('selecting a search result opens the station info panel', async () => {
    mockLocalParams = {};

    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) return { ok: true, json: async () => [] };

      if (url.includes('/stations/search?')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              nom: 'Punt Estació',
              latitud: '41.39',
              longitud: '2.15',
              municipi: 'Barcelona',
              adreca: 'Carrer de Test',
              kw: '50',
              ac_dc: 'DC',
              tipus_connexio: 'CCS',
              promotor: 'Ajuntament',
            },
          ],
        };
      }

      if (url.includes('/stations')) return { ok: true, json: async () => [] };

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { getByTestId, getByText } = render(<InicioScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'Punt');

    await waitFor(() => {
      expect(getByTestId('result-1')).toBeTruthy();
    }, { timeout: 4000 });

    fireEvent.press(getByTestId('result-1'));

    await waitFor(() => {
      expect(getByText('Cómo llegar')).toBeTruthy();
      expect(getByText('Carrer de Test, Barcelona')).toBeTruthy();
    });
  });

  // Cuando `showFavorites=true`, los resultados del buscador se filtran usando la lista de `favoriteIds`.
  test('when showFavorites=true, search results are locally filtered by favoriteIds', async () => {
    mockLocalParams = {
      showFavorites: 'true',
    };

    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) {
        return { ok: true, json: async () => [{ id: 1 }] };
      }

      if (url.includes('/stations/search?')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              nom: 'Favorite Station',
              latitud: '41.39',
              longitud: '2.15',
              municipi: 'Barcelona',
              adreca: 'Carrer Fav',
              kw: '50',
              ac_dc: 'DC',
              tipus_connexio: 'CCS',
            },
            {
              id: 2,
              nom: 'Non Favorite Station',
              latitud: '41.40',
              longitud: '2.16',
              municipi: 'Girona',
              adreca: 'Carrer No',
              kw: '60',
              ac_dc: 'DC',
              tipus_connexio: 'CCS',
            },
          ],
        };
      }

      if (url.includes('/stations')) {
        return { ok: true, json: async () => [] };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { getByTestId, queryByText } = render(<InicioScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'Punt');

    await waitFor(() => {
      expect((globalThis.fetch as any) as jest.Mock).toHaveBeenCalledWith(expect.stringContaining('/stations/search?'));
    }, { timeout: 4000 });

    expect(queryByText('Favorite Station')).toBeTruthy();
    expect(queryByText('Non Favorite Station')).toBeNull();
  });

  // la llamada a `/stations/search` solo ocurre tras 500ms desde el ultimo cambio de texto.
  test('search debounce: calls /stations/search? only after 500ms', async () => {
    jest.useFakeTimers();

    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/stations/search?')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/stations')) {
        return { ok: true, json: async () => [] };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    (globalThis.fetch as any) = fetchMock;

    const { getByTestId } = render(<InicioScreen />);

    // Clear initial mount calls (/favorites + /stations) so we only measure search.
    fetchMock.mockClear();

    fireEvent.changeText(getByTestId('search-input'), 'Punt');

    jest.advanceTimersByTime(499);
    await Promise.resolve();
    expect(fetchMock.mock.calls.some((c) => c[0].includes('/stations/search?'))).toBe(false);

    jest.advanceTimersByTime(1);
    // Flush async work started by the setTimeout callback.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    expect(fetchMock.mock.calls.some((c) => c[0].includes('/stations/search?'))).toBe(true);

    jest.useRealTimers();
  });

  // Si la query tiene menos de 3 caracteres, no se hace la busqueda.
  test('short query (<3 chars) does not call /stations/search?', async () => {
    const fetchMock = globalThis.fetch as unknown as jest.Mock;

    const { getByTestId } = render(<InicioScreen />);

    // Ignore initial mount calls (/favorites + /stations).
    fetchMock.mockClear();

    fireEvent.changeText(getByTestId('search-input'), 'Pi'); // length 2
    await Promise.resolve();

    expect(fetchMock.mock.calls.some((c) => typeof c[0] === 'string' && c[0].includes('/stations/search?'))).toBe(false);
  });

  // Si `/stations/search` falla, el componente no peta y la lista de resultados se mantiene vacia.
  test('search error path: rejects from /stations/search? does not crash and shows no results', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) return { ok: true, json: async () => [] };
      if (url.includes('/stations/search?')) throw new Error('search failed');
      if (url.includes('/stations')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { getByTestId, queryByTestId } = render(<InicioScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'Punt');

    // After debounce + rejected fetch, results should remain empty.
    await waitFor(() => {
      expect(queryByTestId('result-1')).toBeNull();
    }, { timeout: 4000 });
  });

  //si no hay resultados, no se muestran items en el dropdown de resultados.
  test('no results dropdown state: /stations/search? returns [] -> no result items', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) return { ok: true, json: async () => [] };
      if (url.includes('/stations/search?')) return { ok: true, json: async () => [] };
      if (url.includes('/stations')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { getByTestId, queryByTestId } = render(<InicioScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'Punt');

    await waitFor(() => {
      expect(queryByTestId('result-1')).toBeNull();
    }, { timeout: 4000 });
  });

  // Al eliminar un filtro individual de tipo conector solo se limpia connectorType manteniendo minKw/maxKw/ac_dc.
  test('removing a single active filter: clears only connectorType (keeps min/max/ac_dc)', async () => {
    mockLocalParams = {
      minKw: '10',
      maxKw: '20',
      connectorType: 'CCS',
      ac_dc: 'DC',
      showFavorites: 'true',
    };

    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) return { ok: true, json: async () => [{ id: 1 }] };
      if (url.includes('/stations/search?')) return { ok: true, json: async () => [] };
      if (url.includes('/stations')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { UNSAFE_getAllByType, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(queryByText('10 - 20 kW')).toBeTruthy();
    });

    const expected = { minKw: '10', maxKw: '20', connectorType: '', ac_dc: 'DC', showFavorites: 'true' };
    const touchables = UNSAFE_getAllByType(TouchableOpacity);

    for (const t of touchables) {
      mockSetParams.mockClear();
      fireEvent.press(t);
      if (mockSetParams.mock.calls.length > 0) {
        const firstArg = mockSetParams.mock.calls[0][0];
        if (JSON.stringify(firstArg) === JSON.stringify(expected)) {
          return;
        }
      }
    }

    throw new Error('connectorType removal setParams payload not found');
  });

  // Al eliminar un filtro individual de corriente solo se limpia ac_dc manteniendo minKw/maxKw y connectorType.
  test('removing a single active filter: clears only ac_dc (keeps min/max/connectorType)', async () => {
    mockLocalParams = {
      minKw: '10',
      maxKw: '20',
      connectorType: 'CCS',
      ac_dc: 'DC',
      showFavorites: 'true',
    };

    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) return { ok: true, json: async () => [{ id: 1 }] };
      if (url.includes('/stations/search?')) return { ok: true, json: async () => [] };
      if (url.includes('/stations')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { UNSAFE_getAllByType, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(queryByText('10 - 20 kW')).toBeTruthy();
    });

    const expected = {
      minKw: '10',
      maxKw: '20',
      connectorType: 'CCS',
      ac_dc: '',
      showFavorites: 'true',
    };

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    for (const t of touchables) {
      mockSetParams.mockClear();
      fireEvent.press(t);
      if (mockSetParams.mock.calls.length > 0) {
        const firstArg = mockSetParams.mock.calls[0][0];
        if (JSON.stringify(firstArg) === JSON.stringify(expected)) {
          return;
        }
      }
    }

    throw new Error('ac_dc removal setParams payload not found');
  });

  // Al eliminar el filtro de potencia (power chip que engloba minKw/maxKw) solo se limpia minKw/maxKw manteniendo connectorType/ac_dc.
  test('removing a single active filter: clears only power (minKw/maxKw) (keeps connectorType/ac_dc)', async () => {
    mockLocalParams = {
      minKw: '10',
      maxKw: '20',
      connectorType: 'CCS',
      ac_dc: 'DC',
      showFavorites: 'true',
    };

    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) return { ok: true, json: async () => [{ id: 1 }] };
      if (url.includes('/stations/search?')) return { ok: true, json: async () => [] };
      if (url.includes('/stations')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { UNSAFE_getAllByType, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(queryByText('10 - 20 kW')).toBeTruthy();
    });

    const expected = {
      minKw: '',
      maxKw: '',
      connectorType: 'CCS',
      ac_dc: 'DC',
      showFavorites: 'true',
    };

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    for (const t of touchables) {
      mockSetParams.mockClear();
      fireEvent.press(t);
      if (mockSetParams.mock.calls.length > 0) {
        const firstArg = mockSetParams.mock.calls[0][0];
        if (JSON.stringify(firstArg) === JSON.stringify(expected)) {
          return;
        }
      }
    }

    throw new Error('power removal setParams payload not found');
  });

  // todos los filtros se limpian cuando se pulsa el boton de limpiar filtros.
  test('clear active filters calls router.setParams with empty values', async () => {
    // Create a clearFilterButton + at least one active filter row.
    mockLocalParams = {
      minKw: '10',
      maxKw: '20',
      connectorType: 'CCS',
      ac_dc: 'DC',
    };

    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/favorites')) return { ok: true, json: async () => [] };
      if (url.includes('/stations')) return { ok: true, json: async () => [] };
      if (url.includes('/stations/search?')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { UNSAFE_getAllByType, queryByText } = render(<InicioScreen />);

    // Wait until the badge is rendered.
    await waitFor(() => {
      expect(queryByText('10 - 20 kW')).toBeTruthy();
    });

    // Press every TouchableOpacity until we find the "clear filters" call.
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const expected = { minKw: '', maxKw: '', connectorType: '', ac_dc: '', showFavorites: '' };

    for (const t of touchables) {
      mockSetParams.mockClear();
      fireEvent.press(t);
      if (mockSetParams.mock.calls.length > 0) {
        const firstArg = mockSetParams.mock.calls[0][0];
        if (JSON.stringify(firstArg) === JSON.stringify(expected)) {
          return;
        }
      }
    }

    throw new Error('clear filters setParams payload not found');
  });
});

