import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  type RenderAPI,
} from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerResult } from 'expo-image-picker';
import InicioScreen from '@/app/(tabs)/index';
import * as eventosApi from '@/constants/eventosApi';

const mockUseAuth = jest.fn();
const mockUseCharging = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockMapViewRef = {
  animateToRegion: jest.fn(),
  fitToCoordinates: jest.fn(),
};

type FetchJsonBody = {
  ok?: boolean;
  json: () => Promise<unknown>;
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: () => mockUseCharging(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 41.38, longitude: 2.17 },
  })),
}));

jest.mock('expo-image-picker', () => {
  const actual = jest.requireActual<typeof ImagePicker>('expo-image-picker');
  return {
    ...actual,
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
    launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  };
});

jest.mock('react-native-maps-directions', () => () => null);
jest.mock('react-native-maps', () => {
  const React = require('react');
  return { Polyline: () => React.createElement('Polyline') };
});

jest.mock('@/components/TopBar', () => () => null);
jest.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: () => null,
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
      <TouchableOpacity
        testID="map-view"
        onPress={() =>
          onPress?.({
            nativeEvent: { coordinate: { latitude: 41.381, longitude: 2.171 } },
          })
        }
      >
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, pinColor }: any) => {
    let testID = 'station-marker';
    if (pinColor === 'red' || pinColor === '#a855f7') testID = 'favorite-station-marker';
    else if (pinColor === 'yellow' || pinColor === '#ea580c') testID = 'inactive-station-marker';
    else if (pinColor === '#f59e0b' || pinColor === '#f97316') testID = 'custom-location-marker';
    else if (pinColor === 'green' || pinColor === '#0284c7') testID = 'operational-station-marker';

    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  };

  return { MapView, Marker };
});

const baseStation = {
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
  operatiu: true,
};

function resolveFetchUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function installFetchMock(
  handler: (url: string) => FetchJsonBody | Promise<FetchJsonBody>
) {
  globalThis.fetch = jest.fn((input: string | URL | Request) => {
    return Promise.resolve(handler(resolveFetchUrl(input)));
  }) as unknown as typeof fetch;
}

function layoutEventosCarousel(getByTestId: RenderAPI['getByTestId']) {
  fireEvent(getByTestId('eventos-carousel-viewport'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 200, x: 0, y: 0 } },
  });
}

function setupAuthAndCharging() {
  mockUseLocalSearchParams.mockReturnValue({});
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
}

async function openIncidenciaForm(
  getByTestId: RenderAPI['getByTestId'],
  getByText: RenderAPI['getByText']
) {
  await waitFor(() => expect(getByTestId('favorite-station-marker')).toBeTruthy());
  fireEvent.press(getByTestId('favorite-station-marker'));
  fireEvent.press(getByText('Reportar incidencia'));
}

function installDefaultFetch(stations: Record<string, unknown>[] = [baseStation]) {
  installFetchMock((url) => {
    if (url.includes('/favorites')) {
      return { json: async () => [{ id: 1 }] };
    }
    if (url.includes('/reviews')) {
      return { ok: true, json: async () => [] };
    }
    if (url.includes('/incidencias')) {
      return { ok: true, json: async () => ({ id: 1 }) };
    }
    if (url.includes('/eventos') || url.includes('radio_km')) {
      return {
        ok: true,
        json: async () => ({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 101,
              titulo: 'Feria del mapa',
              imagen_url: null,
              distancia_km: 0.3,
              lat: 41.395,
              lon: 2.16,
            },
          ],
        }),
      };
    }
    if (url.includes('/stations') && !url.includes('/search')) {
      return { json: async () => stations };
    }
    return { json: async () => [] };
  });
}

describe('InicioScreen — mapa y marcadores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMapViewRef.animateToRegion.mockClear();
    mockMapViewRef.fitToCoordinates.mockClear();
    setupAuthAndCharging();
    jest.spyOn(eventosApi, 'getEventosApiToken').mockReturnValue('token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marcador inactivo (operatiu false) usa inactive-station-marker', async () => {
    installFetchMock((url) => {
      if (url.includes('/favorites')) {
        return { json: async () => [] };
      }
      if (url.includes('/stations') && !url.includes('/search')) {
        return { json: async () => [{ ...baseStation, operatiu: false }] };
      }
      return { json: async () => [] };
    });

    const { getByTestId, queryByTestId } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('inactive-station-marker')).toBeTruthy());
    expect(queryByTestId('operational-station-marker')).toBeNull();
  });

  it('marcador operativo usa operational-station-marker', async () => {
    installFetchMock((url) => {
      if (url.includes('/favorites')) {
        return { json: async () => [] };
      }
      if (url.includes('/stations') && !url.includes('/search')) {
        return { json: async () => [{ ...baseStation, operatiu: true }] };
      }
      return { json: async () => [] };
    });

    const { getByTestId, queryByTestId } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('operational-station-marker')).toBeTruthy());
    expect(queryByTestId('inactive-station-marker')).toBeNull();
  });

  it('muestra indicador de carga al solicitar estaciones', async () => {
    let resolveStationsJson: (value: unknown[]) => void = () => {};
    const stationsJsonPending = new Promise<unknown[]>((resolve) => {
      resolveStationsJson = resolve;
    });

    installFetchMock((url) => {
      if (url.includes('/favorites')) {
        return { json: async () => [] };
      }
      if (url.includes('/stations') && !url.includes('/search')) {
        return { json: () => stationsJsonPending };
      }
      return { json: async () => [] };
    });

    const { getByTestId } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('map-stations-loading')).toBeTruthy());

    resolveStationsJson([baseStation]);

    await waitFor(() => expect(getByTestId('operational-station-marker')).toBeTruthy());
  });

  it('recarga estaciones con minKw de los parámetros de ruta', async () => {
    mockUseLocalSearchParams.mockReturnValue({ minKw: '22' });
    installDefaultFetch();

    render(<InicioScreen />);

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls;
      expect(
        calls.some((c) => typeof c[0] === 'string' && (c[0] as string).includes('minKw=22'))
      ).toBe(true);
    });
  });

  it('toque en el mapa abre panel de ubicación libre', async () => {
    installDefaultFetch();
    const { getByTestId, getByText } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('map-view')).toBeTruthy());
    fireEvent.press(getByTestId('map-view'));

    await waitFor(() => {
      expect(getByText('Ubicación seleccionada')).toBeTruthy();
      expect(getByText('Cómo llegar')).toBeTruthy();
    });
  });
});

describe('InicioScreen — eventos en el mapa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthAndCharging();
    installDefaultFetch();
    jest.spyOn(eventosApi, 'getEventosApiToken').mockReturnValue('token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('al elegir evento muestra marcador de ubicación y panel con el título', async () => {
    const { getByTestId, getByText, queryByTestId } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('favorite-station-marker')).toBeTruthy());
    fireEvent.press(getByTestId('favorite-station-marker'));
    await waitFor(() => expect(getByText('Eventos cercanos')).toBeTruthy());
    layoutEventosCarousel(getByTestId);
    await waitFor(() => expect(getByText('Feria del mapa')).toBeTruthy());

    fireEvent.press(getByText('Feria del mapa'));

    await waitFor(() => {
      expect(getByTestId('custom-location-marker')).toBeTruthy();
      expect(getByText('Feria del mapa')).toBeTruthy();
      expect(queryByTestId('custom-location-marker')).toBeTruthy();
    });
  });

  it('cerrar panel de evento quita el marcador personalizado', async () => {
    const { getByTestId, getByText, getAllByText, queryByTestId } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('favorite-station-marker')).toBeTruthy());
    fireEvent.press(getByTestId('favorite-station-marker'));
    await waitFor(() => expect(getByText('Eventos cercanos')).toBeTruthy());
    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutEventosCarousel(getByTestId);
    await waitFor(() => expect(getByText('Feria del mapa')).toBeTruthy());

    fireEvent.press(getByText('Feria del mapa'));

    await waitFor(() => expect(getByTestId('custom-location-marker')).toBeTruthy());

    const lastCloseButton = getAllByText('close').at(-1);
    if (lastCloseButton === undefined) {
      throw new Error('No se encontró el botón de cerrar el panel de evento');
    }
    fireEvent.press(lastCloseButton);

    await waitFor(() => {
      expect(queryByTestId('custom-location-marker')).toBeNull();
    });
  });
});

describe('InicioScreen — incidencias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthAndCharging();
    installDefaultFetch();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('envía incidencia con imagen adjunta', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const pickedImage: ImagePickerResult = {
      canceled: false,
      assets: [
        {
          uri: 'file://foto.jpg',
          fileName: 'evidencia.jpg',
          mimeType: 'image/jpeg',
          width: 100,
          height: 100,
        },
      ],
    };
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue(pickedImage);

    installFetchMock((url) => {
      if (url.includes('/favorites')) return { json: async () => [{ id: 1 }] };
      if (url.includes('/stations')) return { json: async () => [baseStation] };
      if (url.includes('/incidencias')) {
        return { ok: true, json: async () => ({ id: 99 }) };
      }
      return { json: async () => [] };
    });

    const { getByTestId, getByText, getByPlaceholderText } = render(<InicioScreen />);
    await openIncidenciaForm(getByTestId, getByText);

    fireEvent.press(getByText('Seleccionar imagen del dispositivo'));
    await waitFor(() => expect(getByText('evidencia.jpg')).toBeTruthy());

    fireEvent.changeText(getByPlaceholderText('Describe qué ha ocurrido'), 'Cable dañado');
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

  it('muestra error si el backend rechaza la incidencia', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    installFetchMock((url) => {
      if (url.includes('/favorites')) return { json: async () => [{ id: 1 }] };
      if (url.includes('/stations')) return { json: async () => [baseStation] };
      if (url.includes('/incidencias')) {
        return { ok: false, json: async () => ({ error: 'Fallo servidor' }) };
      }
      return { json: async () => [] };
    });

    const { getByTestId, getByText, getByPlaceholderText } = render(<InicioScreen />);
    await openIncidenciaForm(getByTestId, getByText);

    fireEvent.changeText(getByPlaceholderText('Describe qué ha ocurrido'), 'Problema');
    fireEvent.press(getByText('Altres'));
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Fallo servidor');
    });

    alertSpy.mockRestore();
  });

  it('alerta si no hay permiso para elegir imagen', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
      granted: false,
      status: ImagePicker.PermissionStatus.DENIED,
      expires: 'never',
      canAskAgain: true,
    });

    const { getByTestId, getByText } = render(<InicioScreen />);
    await openIncidenciaForm(getByTestId, getByText);

    fireEvent.press(getByText('Seleccionar imagen del dispositivo'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Permiso requerido',
        'Necesitamos permiso para acceder a tus imágenes.'
      );
    });

    alertSpy.mockRestore();
  });
});
