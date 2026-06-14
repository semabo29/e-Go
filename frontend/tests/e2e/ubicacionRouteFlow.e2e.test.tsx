/**
 * E2E: buscar una ubicación (geocode) → tocar el mapa tras el redireccionamiento → iniciar ruta.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

const GEO_LAT = 41.387;
const GEO_LNG = 2.17;
const DEST_LAT = 41.388;
const DEST_LNG = 2.171;

let mockLocalParams: Record<string, unknown> = {};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: jest.fn(),
}));

jest.mock('@/features/ads/googleAds', () => ({
  showFullscreenAd: jest.fn(async () => undefined),
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
  getLastKnownPositionAsync: () =>
    Promise.resolve({ coords: { latitude: 41.38, longitude: 2.17 } }),
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

jest.mock('react-native-maps-directions', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => {
    React.useEffect(() => {
      props.onReady?.({
        distance: 4.2,
        duration: 11,
        coordinates: [
          { latitude: 41.38, longitude: 2.17 },
          { latitude: DEST_LAT, longitude: DEST_LNG },
        ],
      });
    }, []);
    return <View testID="map-view-directions" />;
  };
});

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(({ children, onPress }: any, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: jest.fn(),
      animateCamera: jest.fn(),
    }));
    return (
      <TouchableOpacity
        testID="map-view"
        onPress={() =>
          onPress?.({
            nativeEvent: { coordinate: { latitude: DEST_LAT, longitude: DEST_LNG } },
          })
        }
      >
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, pinColor }: any) => {
    let testId = 'station-marker';
    if (pinColor === 'blue') testId = 'user-marker';
    else if (pinColor === 'red') testId = 'favorite-station-marker';
    return (
      <TouchableOpacity
        testID={testId}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  };

  return { MapView, Marker };
});

jest.mock('@/components/StationBottomSheet', () => ({
  StationBottomSheet: () => null,
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

function fetchUrlString(input: unknown): string {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

async function advanceSearchDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('E2E: Ubicación → toque en mapa → iniciar ruta', () => {
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

    globalThis.fetch = jest.fn(async (input: unknown) => {
      const href = fetchUrlString(input);

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
      if (href.includes('/car?')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/stations') && !href.includes('/search')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/geocode/autocomplete')) {
        return {
          ok: true,
          json: async () => [
            {
              placeId: 'place_placa',
              label: 'Plaça Catalunya',
              subtitle: 'Barcelona',
            },
          ],
        } as Response;
      }
      if (href.includes('/geocode/place')) {
        return {
          ok: true,
          json: async () => ({
            lat: GEO_LAT,
            lng: GEO_LNG,
            formattedAddress: 'Plaça Catalunya, Barcelona',
          }),
        } as Response;
      }
      if (href.includes('maps.googleapis.com/maps/api/directions')) {
        return {
          ok: true,
          json: async () => ({
            routes: [
              {
                legs: [
                  {
                    distance: { value: 4200 },
                    duration: { value: 660 },
                    steps: [
                      {
                        html_instructions: 'Sigue recto',
                        maneuver: 'straight',
                        start_location: { lat: 41.38, lng: 2.17 },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;
  });

  test('busca dirección, selecciona punto en el mapa e inicia navegación', async () => {
    jest.useFakeTimers();
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('home-map-screen')).toBeTruthy();
    });

    // 1. Modo direcciones y búsqueda
    fireEvent.press(getByTestId('topbar-search-mode-toggle'));
    fireEvent.changeText(getByTestId('topbar-search-input'), 'Pla');
    await advanceSearchDebounce();

    await waitFor(() => {
      expect(getByTestId('search-result-address-place_placa')).toBeTruthy();
    });

    // 2. Seleccionar ubicación → geocode/place y centrar mapa
    fireEvent.press(getByTestId('search-result-address-place_placa'));

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls;
      expect(calls.some((c) => fetchUrlString(c[0]).includes('/geocode/place'))).toBe(true);
    });

    // 3. Toque en el mapa (destino en el centro tras el redireccionamiento)
    fireEvent.press(getByTestId('map-view'));

    await waitFor(() => {
      expect(getByText('Ubicación seleccionada')).toBeTruthy();
      expect(getByText('Cómo llegar')).toBeTruthy();
    });

    // 4. Iniciar ruta desde mi ubicación
    fireEvent.press(getByText('Cómo llegar'));

    const alertButtons = alertSpy.mock.calls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
    const miUbicacionBtn = alertButtons?.find((b) => b.text === 'Mi ubicación actual');
    await act(async () => {
      miUbicacionBtn?.onPress?.();
    });

    // 5. Modal de autonomía → saltar
    await waitFor(() => {
      expect(getByText('Saltar')).toBeTruthy();
    });
    fireEvent.press(getByText('Saltar'));

    // 6. Navegación activa
    await waitFor(() => {
      expect(getByTestId('map-navigation-panel')).toBeTruthy();
    });
    expect(queryByText('Iniciar')).toBeNull();

    alertSpy.mockRestore();
    jest.useRealTimers();
  });
});
