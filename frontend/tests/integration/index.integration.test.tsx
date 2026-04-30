import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';
import InicioScreen from '@/app/(tabs)/index';

const mockUseAuth = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
const mockGetCurrentPositionAsync = jest.fn(async () => ({
  coords: { latitude: 41.38, longitude: 2.17 },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
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

jest.mock('@/components/TopBar', () => () => null);
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
      <TouchableOpacity testID="map-view" onPress={onPress}>
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, pinColor }: any) => (
    (() => {
      let testID = 'station-marker';
      if (pinColor === 'blue') testID = 'user-marker';
      else if (pinColor === 'red') testID = 'favorite-station-marker';

      return (
    <TouchableOpacity
      testID={testID}
      onPress={() => onPress?.({ stopPropagation: jest.fn() })}
    />
      );
    })()
  );

  return { MapView, Marker };
});

describe('InicioScreen map and station panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/favorites')) {
        return Promise.resolve({
          json: async () => [{ id: 1 }],
        } as Response);
      }
      if (url.includes('/stations')) {
        return Promise.resolve({
          json: async () => [
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
          ],
        } as Response);
      }
      return Promise.resolve({ json: async () => [] } as Response);
    }) as unknown as typeof fetch;
  });

  // muestra el mapa y comprueba que, tras cargar estaciones, aparecen puntos de carga.
  it('renders map with station markers after loading stations', async () => {
    const { getAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getAllByTestId('favorite-station-marker').length).toBeGreaterThan(0);
    });
  });

  // al pulsar un punto de carga se abre el panel de informacion de la estacion y si se clica fuera se cierra.
  it('opens and closes station info panel on marker and map press', async () => {
    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('favorite-station-marker'));
    expect(getByText('Cómo llegar')).toBeTruthy();
    expect(getByText('Carrer de Test, Barcelona')).toBeTruthy();

    fireEvent.press(getByTestId('map-view'));
    expect(queryByText('Cómo llegar')).toBeNull();
  });

  // Si `useAuth` está en modo carga (`isLoading=true`), debe mostrarse el texto "Cargando…".
  it('shows auth loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: jest.fn(),
      isLoading: true,
    });

    const { getByText } = render(<InicioScreen />);
    expect(getByText('Cargando…')).toBeTruthy();
  });

  // Si el usuario no está logueado (`user=null`), se renderiza la pantalla de bienvenida y no aparece el mapa.
  it('shows welcome screen when user is not logged in', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: jest.fn(),
      isLoading: false,
    });

    const { getByText, queryByTestId } = render(<InicioScreen />);
    expect(getByText('Bienvenido a e-Go')).toBeTruthy();
    expect(queryByTestId('map-view')).toBeNull();
  });

  // Verifica que las estaciones favoritas se renderizan con el pin "rojo"
  it('renders favorite station markers in red', async () => {
    const { getAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getAllByTestId('favorite-station-marker').length).toBeGreaterThan(0);
    });
  });

  // Cuando `showFavorites=true`, el mapa debe filtrar localmente y mostrar
  // solo estaciones favoritas (0 marcadores verdes).
  it('filters station markers when showFavorites=true (favorites only)', async () => {
    mockUseLocalSearchParams.mockReturnValue({ showFavorites: 'true' });

    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/favorites')) {
        return Promise.resolve({
          json: async () => [{ id: 1 }],
        } as Response);
      }

      if (url.includes('/stations')) {
        return Promise.resolve({
          json: async () => [
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
            {
              id: 2,
              nom: 'Punt 2',
              latitud: '41.3902',
              longitud: '2.1541',
              municipi: 'Barcelona',
              adreca: 'Carrer de Test 2',
              kw: '60',
              promotor: 'Ajuntament',
              ac_dc: 'DC',
              tipus_connexio: 'CCS',
            },
          ],
        } as Response);
      }

      return Promise.resolve({ json: async () => [] } as Response);
    }) as unknown as typeof fetch;

    const { getAllByTestId, queryAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getAllByTestId('favorite-station-marker').length).toBe(1);
      expect(queryAllByTestId('station-marker').length).toBe(0);
    });
  });

  // Si `/stations` devuelve `[]`, no se deben mostrar puntos de carga.
  it('handles empty stations response without rendering station markers', async () => {
    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/favorites')) {
        return Promise.resolve({ json: async () => [] } as Response);
      }
      if (url.includes('/stations')) {
        return Promise.resolve({ json: async () => [] } as Response);
      }
      return Promise.resolve({ json: async () => [] } as Response);
    }) as unknown as typeof fetch;

    const { getByTestId, queryAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });

    expect(queryAllByTestId('station-marker').length).toBe(0);
    expect(queryAllByTestId('favorite-station-marker').length).toBe(0);
  });

  // Si falla la API de estaciones, el componente no peta
  it('handles stations API failure without crashing', async () => {
    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/favorites')) {
        return Promise.resolve({ json: async () => [{ id: 1 }] } as Response);
      }
      if (url.includes('/stations')) {
        return Promise.reject(new Error('network failed'));
      }
      return Promise.resolve({ json: async () => [] } as Response);
    }) as unknown as typeof fetch;

    const { getByTestId, queryByText, queryAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });

    expect(queryByText('Cómo llegar')).toBeNull();
    expect(queryAllByTestId('station-marker').length).toBe(0);
  });

  // si no se tiene permiso para la ubicacion, se muestra un alert y no se muestra la ubicacion del usuario en el mapa.
  it('shows alert and skips user marker when location permission is denied', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { queryByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(queryByTestId('user-marker')).toBeNull();
    alertSpy.mockRestore();
  });
});
