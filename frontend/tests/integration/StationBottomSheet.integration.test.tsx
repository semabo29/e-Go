import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { StationBottomSheet } from '@/components/StationBottomSheet';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseColorScheme = jest.fn<() => 'light' | 'dark'>(() => 'light');
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => mockUseColorScheme(),
}));

jest.mock('@/constants/api', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

// Bottom sheet simulado: permite disparar onClose como en un gesto de cerrar.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView, TouchableOpacity: Btn } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: { children?: React.ReactNode; onClose?: () => void }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ snapToIndex: jest.fn() }));
      return (
        <View testID="bottom-sheet">
          <Btn testID="bottom-sheet-close-trigger" onPress={() => props.onClose?.()} />
          {props.children}
        </View>
      );
    }),
    BottomSheetScrollView: (props: { children?: React.ReactNode }) => (
      <ScrollView>{props.children}</ScrollView>
    ),
  };
});

// El carrusel de eventos ya tiene suite propia; aquí aislamos acciones del panel.
jest.mock('@/components/StationNearbyEventsCarousel', () => ({
  StationNearbyEventsCarousel: () => null,
}));

const mockStation = {
  id: 10,
  adreca: 'Carrer Fals 123',
  municipi: 'Barcelona',
  kw: '50',
  ac_dc: 'DC',
  tipus_connexio: 'CCS',
  latitud: '41.387',
  longitud: '2.168',
  promotor: 'Operador Test',
  operatiu: true,
};

function buildDefaultProps(overrides: Record<string, unknown> = {}) {
  return {
    station: mockStation,
    onClose: jest.fn(),
    isFavorite: false,
    onToggleFavorite: jest.fn(),
    userLocation: {
      coords: { latitude: 41.38, longitude: 2.17, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    },
    isCharging: false,
    elapsedSeconds: 0,
    distanceToStation: null,
    onStartCharging: jest.fn(async () => true),
    onFinishCharging: jest.fn(),
    onCancelCharging: jest.fn(),
    chargingError: '',
    setChargingError: jest.fn(),
    onStartNavigation: jest.fn(),
    onOpenIncidenciaForm: jest.fn(),
    onSolvedIncidencia: jest.fn(),
    ...overrides,
  };
}

function mockReviewsFetch() {
  globalThis.fetch = jest.fn(async (url: string) => {
    if (url.includes('/reviews')) {
      return { ok: true, json: async () => [] } as Response;
    }
    return { ok: true, json: async () => ({}) } as Response;
  }) as unknown as typeof fetch;
}

describe('StationBottomSheet — acciones, carga y favoritos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
    mockReviewsFetch();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, email: 'u@test.com', username: 'Tester', token: 'tok' },
    });
  });

  // El botón de ruta debe delegar las coordenadas parseadas al mapa 
  test('Cómo llegar llama a onStartNavigation con lat/lon de la estación', async () => {
    const onStartNavigation = jest.fn();
    const { getByText } = render(
      <StationBottomSheet {...buildDefaultProps({ onStartNavigation })} />
    );

    await waitFor(() => expect(getByText('Cómo llegar')).toBeTruthy());
    fireEvent.press(getByText('Cómo llegar'));

    expect(onStartNavigation).toHaveBeenCalledWith({
      latitude: 41.387,
      longitude: 2.168,
    });
  });

  // si la estación está operativa el botón naranja abre el formulario de incidencia en index
  test('estación operativa: Reportar incidencia llama a onOpenIncidenciaForm', async () => {
    const onOpenIncidenciaForm = jest.fn();
    const { getByText } = render(
      <StationBottomSheet {...buildDefaultProps({ onOpenIncidenciaForm })} />
    );

    await waitFor(() => expect(getByText('Reportar incidencia')).toBeTruthy());
    fireEvent.press(getByText('Reportar incidencia'));
    expect(onOpenIncidenciaForm).toHaveBeenCalledTimes(1);
  });

  // si la estación no está operativa se ofrece marcar incidencia como solucionada
  test('estación no operativa: botón solucionada llama a onSolvedIncidencia', async () => {
    const onSolvedIncidencia = jest.fn();
    const station = { ...mockStation, operatiu: false };
    const { getByText, queryByText } = render(
      <StationBottomSheet
        {...buildDefaultProps({ station, onSolvedIncidencia })}
      />
    );

    await waitFor(() => expect(getByText('Reportar incidencia solucionada')).toBeTruthy());
    expect(queryByText('Reportar incidencia')).toBeNull();
    fireEvent.press(getByText('Reportar incidencia solucionada'));
    expect(onSolvedIncidencia).toHaveBeenCalledTimes(1);
  });

  // al pulsar el botón de cargar vehículo se llama a onStartCharging
  test('Cargar Vehículo llama a onStartCharging', async () => {
    const onStartCharging = jest.fn(async () => true);
    const { getByText } = render(
      <StationBottomSheet {...buildDefaultProps({ onStartCharging })} />
    );

    await waitFor(() => expect(getByText('Cargar Vehículo')).toBeTruthy());
    fireEvent.press(getByText('Cargar Vehículo'));

    await waitFor(() => expect(onStartCharging).toHaveBeenCalled());
  });

  // si el padre pasa chargingError se muestra el mensaje al usuario
  test('muestra el mensaje chargingError cuando viene del padre', async () => {
    const { getByText } = render(
      <StationBottomSheet
        {...buildDefaultProps({ chargingError: 'Demasiado lejos para cargar' })}
      />
    );

    await waitFor(() => expect(getByText('Demasiado lejos para cargar')).toBeTruthy());
  });

  // si la sesión está activa se muestran el timer y los botones de finalizar/cancelar
  test('isCharging true: muestra timer y botones de carga activa', async () => {
    const { getByText } = render(
      <StationBottomSheet
        {...buildDefaultProps({
          isCharging: true,
          elapsedSeconds: 65,
          distanceToStation: 10,
        })}
      />
    );

    await waitFor(() => {
      expect(getByText('00:01:05')).toBeTruthy();
      expect(getByText('Finalizar Carga')).toBeTruthy();
      expect(getByText('Cancelar')).toBeTruthy();
    });
  });

  // al pulsar el botón de cancelar durante la carga se llama a onCancelCharging
  test('Cancelar durante carga llama a onCancelCharging', async () => {
    const onCancelCharging = jest.fn();
    const { getByText } = render(
      <StationBottomSheet
        {...buildDefaultProps({
          isCharging: true,
          elapsedSeconds: 120,
          onCancelCharging,
        })}
      />
    );

    await waitFor(() => expect(getByText('Cancelar')).toBeTruthy());
    fireEvent.press(getByText('Cancelar'));
    expect(onCancelCharging).toHaveBeenCalledTimes(1);
  });

  // si el tiempo de carga es suficiente se muestra el modal de confirmación
  test('Finalizar Carga con tiempo suficiente abre modal de confirmación', async () => {
    const { getByText } = render(
      <StationBottomSheet
        {...buildDefaultProps({
          isCharging: true,
          elapsedSeconds: 90,
        })}
      />
    );

    await waitFor(() => expect(getByText('Finalizar Carga')).toBeTruthy());
    fireEvent.press(getByText('Finalizar Carga'));
    expect(getByText('¿Finalizar carga?')).toBeTruthy();
  });

  // al pulsar el botón de cerrar el sheet se llama a onClose
  test('cerrar el bottom sheet llama a onClose', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <StationBottomSheet {...buildDefaultProps({ onClose })} />
    );

    fireEvent.press(getByTestId('bottom-sheet-close-trigger'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Datos de la estación se muestran en los badges
  test('muestra promotor y badges de potencia y conector', async () => {
    const { getByText } = render(<StationBottomSheet {...buildDefaultProps()} />);

    await waitFor(() => {
      expect(getByText('Gestor: Operador Test')).toBeTruthy();
      expect(getByText('50 kW')).toBeTruthy();
      expect(getByText('DC')).toBeTruthy();
      expect(getByText('CCS')).toBeTruthy();
    });
  });

  // si la potencia es 0 se muestra como n/a 
  test('kw 0 muestra n/a en el badge de potencia', async () => {
    const station = { ...mockStation, kw: '0' };
    const { getByText } = render(
      <StationBottomSheet {...buildDefaultProps({ station })} />
    );

    await waitFor(() => expect(getByText('n/a kW')).toBeTruthy());
  });

  // si no hay usuario logueado no debe aparecer el botón de favoritos
  test('sin usuario logueado no muestra el botón de favoritos', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });
    const { queryByTestId } = render(<StationBottomSheet {...buildDefaultProps()} />);

    await waitFor(() => expect(queryByTestId('favorite-button')).toBeNull());
  });

  // al pulsar el botón de favoritos se llama a onToggleFavorite
  test('FavoriteButton: añadir favorito llama POST y onToggleFavorite(true)', async () => {
    const onToggleFavorite = jest.fn();
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/reviews')) {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { getByTestId } = render(
      <StationBottomSheet {...buildDefaultProps({ isFavorite: false, onToggleFavorite })} />
    );

    await waitFor(() => expect(getByTestId('favorite-button')).toBeTruthy());
    fireEvent.press(getByTestId('favorite-button'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/favorites',
        expect.objectContaining({ method: 'POST' })
      );
      expect(onToggleFavorite).toHaveBeenCalledWith(true);
    });
  });

  // durante la carga no deben mostrarse botones de incidencia ni de ruta
  test('isCharging oculta incidencias y Cómo llegar', async () => {
    const { queryByText } = render(
      <StationBottomSheet {...buildDefaultProps({ isCharging: true, elapsedSeconds: 30 })} />
    );

    await waitFor(() => {
      expect(queryByText('Reportar incidencia')).toBeNull();
      expect(queryByText('Cómo llegar')).toBeNull();
    });
  });

  // en tema oscuro se muestran los botones y el formulario sin error
  test('tema oscuro: renderiza acciones y valoraciones sin error', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { getByText } = render(<StationBottomSheet {...buildDefaultProps()} />);

    await waitFor(() => {
      expect(getByText('Cómo llegar')).toBeTruthy();
      expect(getByText('Valoraciones')).toBeTruthy();
    });
  });

  // sin promotor: la rama station.promotor && no pinta el gestor
  test('sin promotor no muestra línea de gestor', async () => {
    const { promotor: _removed, ...stationSinPromotor } = mockStation;
    const { queryByText, getByText } = render(
      <StationBottomSheet {...buildDefaultProps({ station: stationSinPromotor })} />
    );

    await waitFor(() => expect(getByText('Cómo llegar')).toBeTruthy());
    expect(queryByText(/Gestor:/)).toBeNull();
  });

  // si no hay userLocation se muestra el botón de carga con coordenadas 0,0
  test('sin userLocation sigue mostrando Cargar Vehículo', async () => {
    const { getByText } = render(
      <StationBottomSheet {...buildDefaultProps({ userLocation: null })} />
    );

    await waitFor(() => expect(getByText('Cargar Vehículo')).toBeTruthy());
  });

  // fallo al iniciar carga: dispara onError del StartChargingButton (setChargingError + Alert)
  test('error en onStartCharging muestra alert y llama setChargingError', async () => {
    const setChargingError = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onStartCharging = jest.fn(async () => {
      throw new Error('Fallo GPS');
    });

    const { getByText } = render(
      <StationBottomSheet
        {...buildDefaultProps({ onStartCharging, setChargingError })}
      />
    );

    await waitFor(() => expect(getByText('Cargar Vehículo')).toBeTruthy());
    fireEvent.press(getByText('Cargar Vehículo'));

    await waitFor(() => {
      expect(setChargingError).toHaveBeenCalledWith('Fallo GPS');
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Fallo GPS');
    });
    alertSpy.mockRestore();
  });

  // si operatiu es undefined se trata como operativa (botón naranja de incidencia, no solucionada)
  test('operatiu undefined muestra Reportar incidencia estándar', async () => {
    const { operatiu: _op, ...station } = mockStation;
    const { getByText, queryByText } = render(
      <StationBottomSheet {...buildDefaultProps({ station })} />
    );

    await waitFor(() => expect(getByText('Reportar incidencia')).toBeTruthy());
    expect(queryByText('Reportar incidencia solucionada')).toBeNull();
  });

  // si no hay chargingError no se muestra el banner de error
  test('sin chargingError no muestra banner de error', async () => {
    const { queryByText, getByText } = render(
      <StationBottomSheet {...buildDefaultProps({ chargingError: '' })} />
    );

    await waitFor(() => expect(getByText('Cómo llegar')).toBeTruthy());
    expect(queryByText('error-outline')).toBeNull();
  });
});
