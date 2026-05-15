import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { StationBottomSheet } from '@/components/StationBottomSheet';
import { StationNearbyEventsCarousel } from '@/components/StationNearbyEventsCarousel';
import { useAuth } from '@/contexts/AuthContext';
import * as EventosApi from '@/constants/eventosApi';
import { EVENTOS_RADIO_KM_DEFAULT } from '@/constants/eventosApi';

  // --- Mocks de entorno ---

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/constants/api', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'evento-imagen', ...props }),
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ snapToIndex: jest.fn() }));
      return <View testID="bottom-sheet">{props.children}</View>;
    }),
    BottomSheetScrollView: (props: { children?: React.ReactNode }) => (
      <ScrollView>{props.children}</ScrollView>
    ),
  };
});

jest.mock('@/components/FavoriteButton', () => ({ FavoriteButton: () => null }));
jest.mock('@/components/ChargingTimerDisplay', () => ({ ChargingTimerDisplay: () => null }));
jest.mock('@/components/ChargingActionCard', () => ({ ChargingActionCard: () => null }));
jest.mock('@/components/StartChargingButton', () => ({ StartChargingButton: () => null }));

/** Respuesta relevante de la API externa de eventos. */
function eventosPayload(
  results: Array<{
    id: number;
    titulo: string;
    imagen_url: string | null;
    distancia_km: number;
    lat?: number;
    lon?: number;
  }>
) {
  return { count: results.length, next: null, previous: null, results };
}

/** Simula el ancho del carrusel para que se monten las tarjetas. */
function layoutCarouselViewport(getByTestId: (id: string) => { parent?: unknown }) {
  const node = getByTestId('eventos-carousel-viewport');
  fireEvent(node, 'layout', {
    nativeEvent: { layout: { width: 320, height: 200, x: 0, y: 0 } },
  });
}

type EventosResult = Parameters<typeof eventosPayload>[0];
type FetchMock = jest.MockedFunction<typeof fetch>;

/** Convierte el primer argumento de fetch a string de URL (string, URL o Request). */
function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function asResponse(partial: Partial<Response> & Pick<Response, 'ok'>): Response {
  return partial as Response;
}

/** Mock de fetch reutilizable (reseñas vacías + eventos configurables). */
function createFetchMock(getEventosResults: () => EventosResult): FetchMock {
  return jest.fn<typeof fetch>(async (input) => {
    const href = requestUrl(input);
    if (href.includes('/stations/') && href.includes('/reviews')) {
      return asResponse({ ok: true, json: async () => [] });
    }
    if (href.includes('radio_km') || href.includes('/eventos')) {
      return asResponse({
        ok: true,
        json: async () => eventosPayload(getEventosResults()),
      });
    }
    return asResponse({ ok: true, json: async () => ({}) });
  });
}

function installFetchMock(eventosResults: EventosResult) {
  const resultsRef = { current: eventosResults };
  const mock = createFetchMock(() => resultsRef.current);
  globalThis.fetch = mock;
  return {
    mock,
    setEventosResults: (next: EventosResult) => {
      resultsRef.current = next;
    },
  };
}

describe('StationNearbyEventsCarousel - Integración', () => {
  const stationLat = 41.387;
  const stationLon = 2.168;
  let fetchMock: FetchMock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn<typeof fetch>();
    globalThis.fetch = fetchMock;
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('integration-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Sin token en .env el carrusel no llama a la API y muestra instrucciones al desarrollador.
  test('TC1: sin token muestra mensaje de configuración', async () => {
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('');

    const { getByText } = render(
      <StationNearbyEventsCarousel stationLat={stationLat} stationLon={stationLon} isDark={false} />
    );

    await waitFor(() => {
      expect(getByText(/EXPO_PUBLIC_EVENTOS_API_TOKEN/i)).toBeTruthy();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // GET con radio por defecto y pintado de títulos en tarjetas.
  test('TC2: carga eventos y muestra títulos', async () => {
    const { mock: eventosFetch } = installFetchMock([
      { id: 1, titulo: 'Concierto en el Fòrum', imagen_url: null, distancia_km: 0.4, lat: 41.4, lon: 2.17 },
      { id: 2, titulo: 'Mercat de disseny', imagen_url: 'https://example.com/a.jpg', distancia_km: 0.8, lat: 41.39, lon: 2.16 },
    ]);

    const { getByText, getByTestId } = render(
      <StationNearbyEventsCarousel stationLat={stationLat} stationLon={stationLon} isDark={false} />
    );

    await waitFor(() => {
      expect(getByTestId('eventos-carousel-viewport')).toBeTruthy();
    });

    layoutCarouselViewport(getByTestId);

    await waitFor(() => {
      expect(getByText('Concierto en el Fòrum')).toBeTruthy();
      expect(getByText('Mercat de disseny')).toBeTruthy();
      expect(getByText(/Desliza para ver más · 1 \/ 2/)).toBeTruthy();
    });

    const [requestUrlValue, init] = eventosFetch.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Token integration-token');
    expect(requestUrl(requestUrlValue)).toContain(
      `radio_km=${encodeURIComponent(String(EVENTOS_RADIO_KM_DEFAULT))}`
    );
  });

  // Lista vacía: mensaje con el radio fijo de 1 km.
  test('TC3: lista vacía muestra hint de radio 1 km', async () => {
    installFetchMock([]);

    const { getByText } = render(
      <StationNearbyEventsCarousel stationLat={stationLat} stationLon={stationLon} isDark={false} />
    );

    await waitFor(() => {
      expect(getByText('No hay eventos en un radio de 1 km.')).toBeTruthy();
    });
  });

  // si la respuesta no es ok, se muestra un mensaje de error.
  test('TC4: error de API muestra el mensaje devuelto', async () => {
    globalThis.fetch = jest.fn<typeof fetch>(async () =>
      asResponse({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })
    );

    const { getByText } = render(
      <StationNearbyEventsCarousel stationLat={stationLat} stationLon={stationLon} isDark={false} />
    );

    await waitFor(() => {
      expect(getByText(/Eventos 401/)).toBeTruthy();
    });
  });

  // Al tocar una tarjeta con coordenadas se notifica al mapa.
  test('TC5: al pulsar evento llama onFocusEventOnMap con coordenadas', async () => {
    installFetchMock([
      { id: 5, titulo: 'Fira gastronòmica', imagen_url: null, distancia_km: 0.2, lat: 41.388, lon: 2.169 },
    ]);

    const onFocusEventOnMap = jest.fn();
    const { getByText, getByTestId } = render(
      <StationNearbyEventsCarousel
        stationLat={stationLat}
        stationLon={stationLon}
        isDark={false}
        onFocusEventOnMap={onFocusEventOnMap}
      />
    );

    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutCarouselViewport(getByTestId);
    await waitFor(() => expect(getByText('Fira gastronòmica')).toBeTruthy());

    fireEvent.press(getByText('Fira gastronòmica'));

    expect(onFocusEventOnMap).toHaveBeenCalledWith(
      41.388,
      2.169,
      'Fira gastronòmica',
      stationLat,
      stationLon
    );
  });

  // si el evento no tiene coordenadas, se muestra un mensaje de error.
  test('TC6: evento sin coordenadas muestra alerta y no enfoca el mapa', async () => {
    installFetchMock([
      { id: 9, titulo: 'Evento sin mapa', imagen_url: null, distancia_km: 0 },
    ]);

    const alertSpy = jest.spyOn(Alert, 'alert');
    const onFocusEventOnMap = jest.fn();

    const { getByText, getByTestId } = render(
      <StationNearbyEventsCarousel
        stationLat={stationLat}
        stationLon={stationLon}
        isDark={false}
        onFocusEventOnMap={onFocusEventOnMap}
      />
    );

    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutCarouselViewport(getByTestId);
    await waitFor(() => expect(getByText('Evento sin mapa')).toBeTruthy());

    fireEvent.press(getByText('Evento sin mapa'));

    expect(alertSpy).toHaveBeenCalledWith('Evento', 'No hay coordenadas para este evento en el mapa.');
    expect(onFocusEventOnMap).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('StationBottomSheet - Integración Eventos cercanos', () => {
  const mockStation = {
    id: 10,
    adreca: 'Carrer Fals 123',
    municipi: 'Barcelona',
    kw: '50',
    ac_dc: 'DC',
    tipus_connexio: 'CCS',
    latitud: '41.387',
    longitud: '2.168',
  };

  const defaultProps = {
    station: mockStation,
    onClose: jest.fn(),
    isFavorite: false,
    onToggleFavorite: jest.fn(),
    userLocation: null,
    isCharging: false,
    elapsedSeconds: 0,
    distanceToStation: null,
    onStartCharging: jest.fn() as () => Promise<boolean>,
    onFinishCharging: jest.fn(),
    onCancelCharging: jest.fn(),
    chargingError: '',
    setChargingError: jest.fn(),
    onStartNavigation: jest.fn(),
    onOpenIncidenciaForm: jest.fn(),
    onSolvedIncidencia: jest.fn(),
  };

  let fetchMock: ReturnType<typeof installFetchMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: null });
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('panel-token');
    fetchMock = installFetchMock([
      { id: 1, titulo: 'Evento desde panel', imagen_url: null, distancia_km: 0.5, lat: 41.39, lon: 2.17 },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // El panel integra la sección con cabecera y dispara la misma petición que el carrusel.
  test('TC7: muestra sección Eventos cercanos y carga la API externa', async () => {
    const { getByText, getByTestId } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('Eventos cercanos')).toBeTruthy());
    layoutCarouselViewport(getByTestId);
    await waitFor(() => expect(getByText('Evento desde panel')).toBeTruthy());

    const eventosCall = fetchMock.mock.mock.calls.find(([url]) =>
      requestUrl(url).includes('radio_km')
    );
    expect(eventosCall).toBeDefined();
    if (!eventosCall) throw new Error('eventosCall expected');
    const eventosUrl = requestUrl(eventosCall[0]);
    expect(eventosUrl).toContain('lat=41.387');
    expect(eventosUrl).toContain('lon=2.168');
  });

  // al cambiar de estación, se vuelve a pedir eventos con las nuevas coordenadas.
  test('TC8: al cambiar estación vuelve a pedir eventos', async () => {
    const stationB = { ...mockStation, id: 99, latitud: '40.0', longitud: '3.0' };

    const { getByText, getByTestId, rerender } = render(<StationBottomSheet {...defaultProps} />);
    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutCarouselViewport(getByTestId);
    await waitFor(() => expect(getByText('Evento desde panel')).toBeTruthy());

    expect(fetchMock.mock).toHaveBeenCalledWith(
      expect.stringContaining('lat=41.387'),
      expect.anything()
    );

    fetchMock.setEventosResults([
      { id: 2, titulo: 'Evento estación B', imagen_url: null, distancia_km: 0.3, lat: 40.01, lon: 3.01 },
    ]);

    rerender(<StationBottomSheet {...defaultProps} station={stationB} />);

    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutCarouselViewport(getByTestId);
    await waitFor(() => {
      expect(getByText('Evento estación B')).toBeTruthy();
    });

    const eventosCalls = fetchMock.mock.mock.calls.filter(([url]) =>
      requestUrl(url).includes('radio_km')
    );
    expect(eventosCalls.length).toBeGreaterThanOrEqual(2);
    const lastCall = eventosCalls.at(-1);
    if (!lastCall) throw new Error('expected last eventos fetch call');
    const lastEventosUrl = requestUrl(lastCall[0]);
    expect(lastEventosUrl).toContain('lat=40');
    expect(lastEventosUrl).toContain('lon=3');
  });

  // Integración con el mapa: callback del panel hacia index (simulado).
  test('TC9: onFocusEventOnMap del panel recibe datos al pulsar evento', async () => {
    const onFocusEventOnMap = jest.fn();
    const { getByText, getByTestId } = render(
      <StationBottomSheet {...defaultProps} onFocusEventOnMap={onFocusEventOnMap} />
    );

    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutCarouselViewport(getByTestId);
    await waitFor(() => expect(getByText('Evento desde panel')).toBeTruthy());

    fireEvent.press(getByText('Evento desde panel'));

    expect(onFocusEventOnMap).toHaveBeenCalledWith(
      41.39,
      2.17,
      'Evento desde panel',
      41.387,
      2.168
    );
  });
});
