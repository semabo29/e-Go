import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';
import InicioScreen from '@/app/(tabs)/index';

const mockUseAuth = jest.fn();
const mockUseCharging = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockMapViewRef = {
  animateToRegion: jest.fn(),
  fitToCoordinates: jest.fn(),
};
const mockRequestForegroundPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
const mockGetCurrentPositionAsync = jest.fn(async () => ({
  coords: { latitude: 41.38, longitude: 2.17 },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: () => mockUseCharging(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useFocusEffect: jest.fn((cb: any) => cb()), 
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  getCurrentPositionAsync: () => mockGetCurrentPositionAsync(),
  watchPositionAsync: () => Promise.resolve({ remove: jest.fn() }), // Afegit pel test de ruta
  Accuracy: {
    BestForNavigation: 6,
  }
}));

// Mock explícito para controlar selección de imagen en tests del formulario de incidencias.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: true,
    assets: [],
  })),
}));

// Evitamos dependencias nativas de mapas en entorno Jest.
jest.mock('react-native-maps-directions', () => () => null);
jest.mock('react-native-maps', () => {
  const React = require('react');
  return {
    Polyline: (_props: any) => React.createElement('Polyline'),
  };
});

jest.mock('@/components/TopBar', () => () => null);
jest.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

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
            nativeEvent: {
              coordinate: { latitude: 41.38, longitude: 2.17 },
            },
          })
        }
      >
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, pinColor, testID: propTestID }: any) => (
    (() => {
      let testID = propTestID || 'station-marker'; // Ahora lee el propTestID si existe
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
      if (url.includes('/skins/conductor/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
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
    // Al pulsar el mapa puede abrirse el panel de "ubicación seleccionada",
    // por eso validamos elementos exclusivos del panel de estación.
    expect(queryByText('Reportar incidencia')).toBeNull();
    expect(queryByText('Carrer de Test, Barcelona')).toBeNull();
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
      if (url.includes('/skins/conductor/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
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
      if (url.includes('/skins/conductor/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
        } as Response);
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
      if (url.includes('/skins/conductor/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
        } as Response);
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

  // Se abre el formulario de incidencias desde el panel de la estación.
  it('opens incidencia form modal from station panel', async () => {
    const { getByTestId, getByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('favorite-station-marker'));
    fireEvent.press(getByText('Reportar incidencia'));

    expect(getByText('Comentario')).toBeTruthy();
    expect(getByText('Tipo')).toBeTruthy();
    expect(getByText('Archivo (imagen)')).toBeTruthy();
    expect(getByText('Enviar')).toBeTruthy();
    expect(getByText('Volver')).toBeTruthy();
  });

  // Si comentario/tipo están vacíos, se muestra un alert y no se envía la incidencia.
  it('shows required fields alert when submitting empty incidencia form', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, getByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('favorite-station-marker'));
    fireEvent.press(getByText('Reportar incidencia'));
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Campos obligatorios', 'Debes rellenar comentario y tipo.');
    });

    alertSpy.mockRestore();
  });

  // Se envía la incidencia correctamente.
  it('submits incidencia form and calls backend endpoint', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/favorites')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1 }],
        } as Response);
      }
      if (url.includes('/stations')) {
        return Promise.resolve({
          ok: true,
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
      if (url.includes('/skins/conductor/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
        } as Response);
      }
      if (url.includes('/incidencias')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 123 }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as unknown as typeof fetch;

    const { getByTestId, getByText, getByPlaceholderText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('favorite-station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('favorite-station-marker'));
    fireEvent.press(getByText('Reportar incidencia'));
    fireEvent.changeText(getByPlaceholderText('Describe qué ha ocurrido'), 'Conector roto');
    fireEvent.press(getByText('Avariat'));
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Incidencia enviada', 'La incidencia se ha registrado correctamente.');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidencias'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    alertSpy.mockRestore();
  });

  // Cuando la estación no está operativa, debe mostrarse el botón de incidencia solucionada.
  it('shows "Reportar incidencia solucionada" button when station operatiu is false', async () => {
    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/favorites')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }
      if (url.includes('/stations')) {
        return Promise.resolve({
          ok: true,
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
              operatiu: false,
            },
          ],
        } as Response);
      }
      if (url.includes('/skins/conductor/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as unknown as typeof fetch;

    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('station-marker'));

    expect(getByText('Reportar incidencia solucionada')).toBeTruthy();
    expect(queryByText('Reportar incidencia')).toBeNull();
  });

  // El botón de incidencia solucionada debe enviar directamente al backend sin abrir formulario.
  it('submits solved incidencia directly without opening form modal', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/favorites')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }
      if (url.includes('/stations')) {
        return Promise.resolve({
          ok: true,
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
              operatiu: false,
            },
          ],
        } as Response);
      }
      if (url.includes('/skins/conductor/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
            punts: 1000
          })
        } as Response);
      }
      if (url.includes('/incidencias')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 321 }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as unknown as typeof fetch;

    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('station-marker')).toBeTruthy();
    });

    fireEvent.press(getByTestId('station-marker'));
    fireEvent.press(getByText('Reportar incidencia solucionada'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Incidencia reportada', 'Se ha marcado la estación como operativa.');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidencias'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(queryByText('Comentario')).toBeNull();
    alertSpy.mockRestore();
  });
});

/** Simula layout del carrusel de eventos */
function layoutEventosCarousel(getByTestId: (id: string) => unknown) {
  fireEvent(getByTestId('eventos-carousel-viewport'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 200, x: 0, y: 0 } },
  });
}

function installFetchWithEventos() {
  globalThis.fetch = jest.fn((url: string) => {
    const href = String(url);
    if (href.includes('/favorites')) {
      return Promise.resolve({ json: async () => [{ id: 1 }] } as Response);
    }
    if (href.includes('/reviews')) {
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }
    if (href.includes('radio_km') || href.includes('/eventos')) {
      return Promise.resolve({
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
      } as Response);
    }
    if (href.includes('/stations')) {
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
    if (href.includes('/skins/conductor/')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          inventari: [{ id: 1, equipada: true, arxiu_asset: 'cotxe_basic' }],
          punts: 1000
        })
      } as Response);
    }
    return Promise.resolve({ json: async () => [] } as Response);
  }) as unknown as typeof fetch;
}

describe('InicioScreen - evento en mapa y ruta desde estación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMapViewRef.fitToCoordinates.mockClear();
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
    installFetchWithEventos();
    jest.spyOn(
      require('@/constants/eventosApi'),
      'getEventosApiToken'
    ).mockReturnValue('map-integration-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Tocar evento cierra el panel de estación y centra el mapa en la estación y el evento
  it('al elegir un evento cierra el panel de estación y encuadra el mapa', async () => {
    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('favorite-station-marker')).toBeTruthy());
    fireEvent.press(getByTestId('favorite-station-marker'));
    await waitFor(() => expect(getByText('Eventos cercanos')).toBeTruthy());
    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutEventosCarousel(getByTestId);
    await waitFor(() => expect(getByText('Feria del mapa')).toBeTruthy());

    fireEvent.press(getByText('Feria del mapa'));

    await waitFor(() => {
      expect(queryByText('Reportar incidencia')).toBeNull();
      expect(getByText('Feria del mapa')).toBeTruthy();
    });

    await waitFor(() => {
      expect(mockMapViewRef.fitToCoordinates).toHaveBeenCalled();
    });
    const [coords] = mockMapViewRef.fitToCoordinates.mock.calls[0];
    expect(coords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ latitude: 41.3901, longitude: 2.154 }),
        expect.objectContaining({ latitude: 41.395, longitude: 2.16 }),
      ])
    );
  });

  // Cómo llegar tras un evento usa origen en la estación
  it('Cómo llegar tras evento usa origen en estación sin preguntar GPS', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByTestId, getByText, getAllByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => expect(getByTestId('favorite-station-marker')).toBeTruthy());
    fireEvent.press(getByTestId('favorite-station-marker'));
    await waitFor(() => expect(getByText('Eventos cercanos')).toBeTruthy());
    await waitFor(() => expect(getByTestId('eventos-carousel-viewport')).toBeTruthy());
    layoutEventosCarousel(getByTestId);
    await waitFor(() => expect(getByText('Feria del mapa')).toBeTruthy());
    fireEvent.press(getByText('Feria del mapa'));

    await waitFor(() => expect(queryByText('Reportar incidencia')).toBeNull());

    const routeButtons = getAllByText('Cómo llegar');
    fireEvent.press(routeButtons[routeButtons.length - 1]);

    await waitFor(() => {
      const iniciarCalls = alertSpy.mock.calls.filter((c) => c[0] === 'Iniciar ruta');
      expect(iniciarCalls.length).toBe(0);
    });

    alertSpy.mockRestore();
  });

  it('renderiza el marcador del coche del usuario y hace fallback si la API falla', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 41.38, longitude: 2.17 },
    });

    globalThis.fetch = jest.fn((url: string) => {
      if (url.includes('/skins/conductor/')) {
        return Promise.reject(new Error('Backend error'));
      }
      if (url.includes('/favorites')) {
        return Promise.resolve({ json: async () => [{ id: 1 }] } as Response);
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

    const { getByTestId } = render(<InicioScreen />);

    // Debido al prop pinColor="blue", el mock del mapa expone el coche como 'user-marker'
    await waitFor(() => {
      expect(getByTestId('user-marker')).toBeTruthy();
    });
  });
});
