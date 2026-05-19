/**
 * E2E de flujo UI: panel estación → eventos → clic evento → mapa → navegación.
 * Ejecutar: npm run test:e2e -- eventNavigationFlow
 *
 * Usa mocks de infraestructura (mapa, fetch, Directions, auth) pero componentes reales
 * del carrusel de eventos y del panel. No es E2E “puro” contra backend real.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

/** Referencia al mapa para comprobar que se llama fitToCoordinates al enfocar un evento. */
const mockMapViewRef = {
  animateToRegion: jest.fn(),
  fitToCoordinates: jest.fn(),
};

/** Estación abierta en el panel; coordenadas de origen de la ruta al navegar desde un evento. */
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

/** Evento devuelto por el mock de la API externa (/eventos); el carrusel lo muestra en el panel. */
const mockEvent = {
  id: 101,
  titulo: 'Feria E2E',
  imagen_url: null,
  distancia_km: 0.3,
  lat: 41.395,
  lon: 2.16,
};

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

// Simula Google Directions: al montar el componente, llama onReady con distancia/duración ficticias.
jest.mock('react-native-maps-directions', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: {
    onReady?: (result: {
      distance: number;
      duration: number;
      coordinates: { latitude: number; longitude: number }[];
    }) => void;
  }) => {
    React.useEffect(() => {
      props.onReady?.({
        distance: 2.5,
        duration: 8,
        coordinates: [
          { latitude: 41.3901, longitude: 2.154 },
          { latitude: 41.395, longitude: 2.16 },
        ],
      });
    }, []);
    return <View testID="map-view-directions" />;
  };
});

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(
    ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }, ref: unknown) => {
      React.useImperativeHandle(ref, () => mockMapViewRef);
      return (
        <TouchableOpacity testID="map-view" onPress={onPress}>
          <View>{children}</View>
        </TouchableOpacity>
      );
    }
  );

  const Marker = ({
    onPress,
    pinColor,
    testID: markerTestId,
  }: {
    onPress?: (e: { stopPropagation: () => void }) => void;
    pinColor?: string;
    testID?: string;
  }) => {
    let testID = markerTestId ?? 'station-marker';
    if (pinColor === 'blue') testID = 'user-marker';
    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  };

  return { MapView, Marker };
});

jest.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

jest.mock('@/components/ads/GoogleBannerAd', () => ({
  GoogleBannerAd: () => null,
}));

/** El carrusel necesita un layout con ancho > 0 para renderizar las tarjetas (ScrollView horizontal). */
function layoutEventosCarousel(getByTestId: (id: string) => unknown) {
  fireEvent(getByTestId('eventos-carousel-viewport'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 200, x: 0, y: 0 } },
  });
}

async function advanceSearchDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

/** Reutiliza el flujo de búsqueda del primer E2E para abrir el panel de estación. */
async function openStationPanelViaSearch(getByTestId: (id: string) => unknown) {
  fireEvent.changeText(getByTestId('topbar-search-input'), 'Punt');
  await advanceSearchDebounce();
  await waitFor(() => {
    expect(getByTestId('search-result-station-42')).toBeTruthy();
  });
  fireEvent.press(getByTestId('search-result-station-42'));
  await waitFor(() => {
    expect(getByTestId('station-bottom-sheet')).toBeTruthy();
  });
}

describe('E2E: eventos y navegación desde el panel', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseCharging = useCharging as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = {};
    mockMapViewRef.fitToCoordinates.mockClear();

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

    jest.spyOn(require('@/constants/eventosApi'), 'getEventosApiToken').mockReturnValue('e2e-token');

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
      if (href.includes('radio_km') || href.includes('/eventos')) {
        return {
          ok: true,
          json: async () => ({
            count: 1,
            next: null,
            previous: null,
            results: [mockEvent],
          }),
        } as Response;
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('panel → cargar eventos → clic evento → mapa → iniciar navegación', async () => {
    jest.useFakeTimers();

    // —— Paso 0: pantalla del mapa con sesión iniciada ——
    const { getByTestId, getByText, queryByTestId } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('home-map-screen')).toBeTruthy());

    // —— Pasos 1–4: abrir el panel de la estación vía buscador (mismo flujo que searchStationPanel) ——
    await openStationPanelViaSearch(getByTestId);

    // —— Paso 5: el panel carga eventos de la API externa (fetch mock a /eventos) ——
    await waitFor(() => expect(getByText('Eventos cercanos')).toBeTruthy());
    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutEventosCarousel(getByTestId);
    await waitFor(() => expect(getByText('Feria E2E')).toBeTruthy());

    // —— Paso 6: pulsar el evento → cierra el panel de estación y enfoca el mapa ——
    fireEvent.press(getByTestId('event-carousel-card-101'));

    // handleFocusEventOnMap usa requestAnimationFrame; hay que avanzar timers ficticios.
    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      // Panel de estación cerrado; panel de la ubicación del evento visible.
      expect(queryByTestId('station-bottom-sheet')).toBeNull();
      expect(getByTestId('event-location-panel')).toBeTruthy();
      // Marcador del evento en el mapa y título en el panel inferior.
      expect(getByTestId('map-event-marker')).toBeTruthy();
      expect(getByText('Feria E2E')).toBeTruthy();
      // El mapa encuadra estación + evento.
      expect(mockMapViewRef.fitToCoordinates).toHaveBeenCalled();
    });

    const [fitCoords] = mockMapViewRef.fitToCoordinates.mock.calls[0];
    expect(fitCoords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ latitude: 41.3901, longitude: 2.154 }),
        expect.objectContaining({ latitude: 41.395, longitude: 2.16 }),
      ])
    );

    // —— Paso 7: «Cómo llegar» — origen = estación (preset), sin pedir GPS ——
    await act(async () => {
      fireEvent.press(getByTestId('event-location-how-to-arrive'));
    });

    // —— Paso 8: se pide la ruta a Google Directions (mock) ——
    await waitFor(() => {
      expect(getByTestId('map-view-directions')).toBeTruthy();
    });

    // —— Paso 9: ruta lista → panel de navegación con distancia y tiempo ——
    await waitFor(() => {
      expect(getByTestId('map-navigation-panel')).toBeTruthy();
      expect(getByText(/2\.5\s*km/)).toBeTruthy();
      expect(getByText(/8\s*min/)).toBeTruthy();
    });

    jest.useRealTimers();
  });
});
