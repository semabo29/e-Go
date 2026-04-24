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
    <TouchableOpacity
      testID={
        pinColor === 'blue'
          ? 'user-marker'
          : pinColor === 'red'
            ? 'favorite-station-marker'
            : 'station-marker'
      }
      onPress={() => onPress?.({ stopPropagation: jest.fn() })}
    />
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

    global.fetch = jest.fn((url: string) => {
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

  it('renders map with station markers after loading stations', async () => {
    const { getAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getAllByTestId('favorite-station-marker').length).toBeGreaterThan(0);
    });
  });

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

  it('shows auth loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: jest.fn(),
      isLoading: true,
    });

    const { getByText } = render(<InicioScreen />);
    expect(getByText('Cargando…')).toBeTruthy();
  });

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

  it('renders favorite station markers in red', async () => {
    const { getAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getAllByTestId('favorite-station-marker').length).toBeGreaterThan(0);
    });
  });

  it('handles empty stations response without rendering station markers', async () => {
    global.fetch = jest.fn((url: string) => {
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

  it('handles stations API failure without crashing', async () => {
    global.fetch = jest.fn((url: string) => {
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
