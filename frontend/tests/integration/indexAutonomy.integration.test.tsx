import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { appFetch } from '@/services/appFetch';

// 1. SILENCIAMOS WARNINGS INOFENSIVOS EN TESTS
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Animated(View)')) return;
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('MapViewDirections')) return;
  originalConsoleWarn(...args);
};

const mockMapViewRef = {
  animateToRegion: jest.fn(),
  fitToCoordinates: jest.fn(),
};

// 2. MOCKS DE CONTEXTOS Y NAVEGACIÓN
// Constantes estables para que React no detecte cambios infinitos en los useEffects
const MOCK_USER = { id: 1, name: 'Test User' };
const MOCK_PARAMS = {};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: MOCK_USER }),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: () => ({ activeSession: null }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => MOCK_PARAMS,
  useFocusEffect: jest.fn((cb: any) => {
    require('react').useEffect(() => {
      const cleanup = cb();
      return () => { if (cleanup) cleanup(); };
    }, []);
  }),
}));

// Mock del GPS para tener una ubicación inicial controlada (Origen)
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getCurrentPositionAsync: () => Promise.resolve({ coords: { latitude: 41.0, longitude: 2.0 } }),
  getLastKnownPositionAsync: () => Promise.resolve({ coords: { latitude: 41.0, longitude: 2.0 } }),
  watchPositionAsync: () => Promise.resolve({ remove: jest.fn() }),
  Accuracy: { High: 6, Balanced: 3, Low: 1 }
}));

// Evitamos que los iconos rompan el renderizado en Test
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: any) => <Text>{name}</Text>;
});

// Mock de appFetch para que devuelva nuestros coches de prueba
jest.mock('@/services/appFetch', () => ({
  appFetch: jest.fn(),
}));

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(({ children, onPress }: any, ref: any) => {
    React.useImperativeHandle(ref, () => mockMapViewRef);
    return (
      <TouchableOpacity
        testID="map-view"
        onPress={(event) => onPress?.(event)}
      >
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, pinColor, testID: propTestID }: any) => {
    let testID = propTestID || 'station-marker';
    if (pinColor === 'blue') testID = 'user-marker';
    else if (pinColor === 'red') testID = 'favorite-station-marker';

    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onPress?.({ stopPropagation: jest.fn() })}
      />
    );
  };

  return { MapView, Marker };
});

describe('Gestión de Autonomía y Selección de Vehículo', () => {
  let alertSpy: any;

  const mockStations = [
    // Cargador Incompatible (AC, Mennekes) - Más cerca pero no sirve para nuestro coche DC/CCS
    { id: 1, nom: 'Cargador Incompatible', latitud: '41.5', longitud: '2.0', operatiu: true, tipus_connexio: 'Mennekes', ac_dc: 'AC', kw: '22' },
    // Cargador Compatible (DC, CCS) - Un poco más lejos pero encaja perfecto
    { id: 2, nom: 'Cargador Compatible', latitud: '41.6', longitud: '2.0', operatiu: true, tipus_connexio: 'CCS', ac_dc: 'DC', kw: '150' },
  ];

  const mockVehicles = [
    { id: 101, nom: 'Tesla Model 3', kw: '150', tipus_connexio: 'CCS', ac_dc: 'DC' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

   // 1. Hacemos que appFetch sea inteligente y responda según la URL
       (appFetch as jest.Mock).mockImplementation(async (url: string) => {
         if (url.includes('/car')) return { ok: true, json: async () => mockVehicles };
         if (url.includes('/stations')) return { ok: true, json: async () => mockStations };
         if (url.includes('/favorites')) return { ok: true, json: async () => [] };
         return { ok: true, json: async () => [] };
       });

       // 2. Mantenemos globalThis.fetch SOLO para la API externa de Google Maps
       (globalThis.fetch as any) = jest.fn(async (url: string) => {
         if (url.includes('directions')) return { ok: true, json: async () => ({ routes: [] }) };
         return { ok: true, json: async () => [] };
       });
     });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('TC1: El usuario salta la autonomía y se traza ruta directa', async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<InicioScreen />);

    // 1. Esperamos que se hayan cargado las estaciones
    await waitFor(() => expect(appFetch).toHaveBeenCalledWith(expect.stringContaining('/stations')));

    // 2. Simular clic en el mapa (Destino)
    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', {
        nativeEvent: { coordinate: { latitude: 42.0, longitude: 2.0 } },
      });
    });

    // 3. Darle a "Cómo llegar" y luego "Mi ubicación actual"
    const btn = await waitFor(() => getByText('Cómo llegar'));
    await act(async () => fireEvent.press(btn));

    const alertCalls = alertSpy.mock.calls;
    const miUbicacionBtn = alertCalls[0][2]?.find((b: any) => b.text === 'Mi ubicación actual' || b.text === 'La meva ubicació actual');

    await act(async () => {
      if (miUbicacionBtn?.onPress) miUbicacionBtn.onPress();
    });

    // 4. Se abre el Modal de Autonomía. Pulsamos "Saltar" directamente sin poner coche ni kms.
    const btnSaltar = await waitFor(() => getByText('Saltar'));
    await act(async () => fireEvent.press(btnSaltar));

    // 5. La ruta debe calcularse directo a Google Maps sin paradas (no salta ninguna alerta de parada)
    expect(alertSpy).not.toHaveBeenCalledWith('Parada añadida', expect.any(String));
    expect(alertSpy).not.toHaveBeenCalledWith('Parada necesaria', expect.any(String));
  });

  test('TC2: Autonomía suficiente (ruta directa)', async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<InicioScreen />);
    await waitFor(() => expect(appFetch).toHaveBeenCalledWith(expect.stringContaining('/stations')));

    // Simular destino
    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', { nativeEvent: { coordinate: { latitude: 42.0, longitude: 2.0 } } });
    });

    await act(async () => fireEvent.press(await waitFor(() => getByText('Cómo llegar'))));

    const alertCalls = alertSpy.mock.calls;
    const miUbicacionBtn = alertCalls[0][2]?.find((b: any) => b.text === 'Mi ubicación actual' || b.text === 'La meva ubicació actual');
    await act(async () => { if (miUbicacionBtn?.onPress) miUbicacionBtn.onPress(); });

    // Ponemos una autonomía enorme (1000km)
    const input = await waitFor(() => getByPlaceholderText('Ej: 150 (km)'));
    await act(async () => fireEvent.changeText(input, '1000'));

    // Calcular Ruta
    const btnCalcular = getByText('Calcular Ruta');
    await act(async () => fireEvent.press(btnCalcular));

    // Verificamos que salta la alerta de que llega sobrado
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Ruta directa", expect.stringContaining("autonomía suficiente"));
    });
  });

  test('TC3: Falta autonomía y filtra estrictamente por el coche seleccionado', async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<InicioScreen />);
    await waitFor(() => expect(appFetch).toHaveBeenCalledWith(expect.stringContaining('/stations')));

    // Simular destino a 42.0 (Distancia aproximada en recta: 111km)
    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', { nativeEvent: { coordinate: { latitude: 42.0, longitude: 2.0 } } });
    });

    await act(async () => fireEvent.press(await waitFor(() => getByText('Cómo llegar'))));

    const alertCalls = alertSpy.mock.calls;
    const miUbicacionBtn = alertCalls[0][2]?.find((b: any) => b.text === 'Mi ubicación actual' || b.text === 'La meva ubicació actual');
    await act(async () => { if (miUbicacionBtn?.onPress) miUbicacionBtn.onPress(); });

    // 1. Ponemos autonomía ajustada (120km) para que falle el margen del destino (50km)
    // pero cumpla tu nuevo margen del cargador (20km)
    const input = await waitFor(() => getByPlaceholderText('Ej: 150 (km)'));
    await act(async () => fireEvent.changeText(input, '120'));

    // 2. Seleccionamos el coche (Tesla Model 3, que es DC y CCS)
    const carChip = await waitFor(() => getByText(/Tesla Model 3/i));
    await act(async () => fireEvent.press(carChip));

    // 3. Calculamos la ruta
    const btnCalcular = getByText('Calcular Ruta');
    await act(async () => fireEvent.press(btnCalcular));

    // 4. Verificamos que primero te avisa de que hace falta parada
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Parada necesaria", expect.any(String));
    });

    // 5. Y LO MÁS IMPORTANTE: Comprobamos que el algoritmo ha escogido el cargador "Compatible"
    // y ha ignorado el "Incompatible" (aunque estuviese más cerca en las coordenadas).
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Parada añadida",
        expect.stringContaining("Cargador Compatible")
      );
      expect(alertSpy).not.toHaveBeenCalledWith(
        "Parada añadida",
        expect.stringContaining("Cargador Incompatible")
      );
    });
  });
});