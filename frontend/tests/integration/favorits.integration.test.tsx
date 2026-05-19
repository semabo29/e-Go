import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FavoriteButton } from '@/components/FavoriteButton';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';
import InicioScreen from '@/app/(tabs)/index';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: jest.fn(),
}));

const mockPush = jest.fn();
const mockSetParams = jest.fn();

let mockLocalParams: Record<string, any> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    setParams: mockSetParams,
    navigate: jest.fn(),
    back: jest.fn(),
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

jest.mock('@/components/TopBar', () => () => null);

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { TouchableOpacity, View } = require('react-native');

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

  const Marker = ({ onPress, pinColor, testID }: any) => {
    let testId = testID || 'station-marker';
    if (!testID) {
      if (pinColor === 'red') testId = 'favorite-station-marker';
    }
    return (
      <TouchableOpacity
        testID={testId}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  };

  return { MapView, Marker };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

describe('FavoriteButton integration (with mocked fetch)', () => {
  const userId = 12;
  const stationId = 99;

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: userId, email: 'user@test.com', username: 'user', created_at: '', updated_at: '' },
      logout: jest.fn(),
      isLoading: false,
      setUser: jest.fn(),
    });
    (useCharging as jest.Mock).mockReturnValue({
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

    globalThis.fetch = jest.fn(async () => ({ ok: true })) as unknown as typeof fetch;
  });

  test('toggle ON sends POST /favorites and calls onToggle(true)', async () => {
    const onToggle = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { UNSAFE_getByType } = render(
      <FavoriteButton estacio_id={stationId} isInitiallyFavorite={false} onToggle={onToggle} />
    );

    fireEvent.press(UNSAFE_getByType(TouchableOpacity));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites'),
      expect.objectContaining({
        method: 'POST',
      })
    );

    const fetchCallArgs = (globalThis.fetch as unknown as jest.Mock).mock.calls[0];
    const options = fetchCallArgs[1] as RequestInit & { body?: string };
    const parsedBody = options.body ? JSON.parse(options.body) : null;
    expect(parsedBody).toEqual({ usuari_id: userId, estacio_id: stationId });

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('toggle OFF shows alert when server returns non-ok', async () => {
    (globalThis.fetch as unknown as jest.Mock<any>).mockResolvedValueOnce({ ok: false } as any);
    const onToggle = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { UNSAFE_getByType } = render(<FavoriteButton estacio_id={stationId} isInitiallyFavorite={true} onToggle={onToggle} />);
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(onToggle).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test('toggle OFF sends DELETE /favorites and calls onToggle(false) when server returns ok', async () => {
    const onToggle = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { UNSAFE_getByType } = render(
      <FavoriteButton estacio_id={stationId} isInitiallyFavorite={true} onToggle={onToggle} />
    );

    fireEvent.press(UNSAFE_getByType(TouchableOpacity));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );

    const fetchCallArgs = (globalThis.fetch as unknown as jest.Mock).mock.calls[0];
    const options = fetchCallArgs[1] as RequestInit & { body?: string };
    const parsedBody = options.body ? JSON.parse(options.body) : null;
    expect(parsedBody).toEqual({ usuari_id: userId, estacio_id: stationId });

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('toggle shows connection Alert when fetch throws (network error)', async () => {
    const onToggle = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (globalThis.fetch as unknown as jest.Mock<any>).mockRejectedValueOnce(new Error('network failed') as any);

    const { UNSAFE_getByType } = render(
      <FavoriteButton estacio_id={stationId} isInitiallyFavorite={false} onToggle={onToggle} />
    );

    fireEvent.press(UNSAFE_getByType(TouchableOpacity));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Error de conexión');
    });

    expect(onToggle).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test('loading state disables multiple presses while request is in-flight', async () => {
    const onToggle = jest.fn();
    const resolveFetch: Array<(v: any) => void> = [];

    (globalThis.fetch as unknown as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => resolveFetch.push(resolve));
    });

    const { UNSAFE_getByType, UNSAFE_queryByType } = render(
      <FavoriteButton estacio_id={stationId} isInitiallyFavorite={false} onToggle={onToggle} />
    );

    const touchable = UNSAFE_getByType(TouchableOpacity);
    fireEvent.press(touchable);

    await waitFor(() => {
      expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
    });

    await waitFor(() => {
      const t = UNSAFE_getByType(TouchableOpacity);
      expect(t.props.disabled).toBe(true);
      expect((globalThis.fetch as unknown as jest.Mock).mock.calls.length).toBe(1);
    });

    resolveFetch[0]({ ok: true });

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  test('when user is null, pressing does not call fetch', async () => {
    (useAuth as unknown as jest.Mock).mockReturnValue({
      user: null,
      logout: jest.fn(),
      isLoading: false,
      setUser: jest.fn(),
    });

    const { UNSAFE_getByType } = render(<FavoriteButton estacio_id={stationId} isInitiallyFavorite={false} />);
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));

    await waitFor(() => {
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });
});

describe('InicioScreen integration: favorite interactions on station panel', () => {
  const userId = 12;
  const stationId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = {};

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: userId, email: 'user@test.com', username: 'user', created_at: '', updated_at: '' },
      logout: jest.fn(),
      isLoading: false,
      setUser: jest.fn(),
    });

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/favorites?usuari_id=')) {
        return { ok: true, status: 200, json: async () => [] } as any;
      }

      if (url.includes('/stations')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: stationId,
              nom: 'Estació 1',
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
        } as any;
      }

      if (url.includes('/skins/conductor/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
        } as any;
      }

      if (url.includes('/favorites') && options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({}) } as any;
      }

      if (url.includes('/favorites') && options?.method === 'DELETE') {
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });
  });

  test('toggling FavoriteButton changes marker pin (green -> red -> green)', async () => {
    const { getByTestId, getAllByText, queryByTestId } = render(<InicioScreen />);

    const markerEstacion = await waitFor(() => getByTestId('station-marker'));
    expect(markerEstacion).toBeTruthy();

    fireEvent.press(markerEstacion);

    await waitFor(() => {
      expect(getAllByText('favorite-border').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByText('favorite-border')[0]);

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
      expect(queryByTestId('station-marker')).toBeNull();
    });

    fireEvent.press(getAllByText('favorite')[0]);

    await waitFor(() => {
      expect(getByTestId('station-marker')).toBeTruthy(); 
      expect(queryByTestId('favorite-station-marker')).toBeNull();
    });
  });
});