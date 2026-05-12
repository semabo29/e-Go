import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';

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

//MOCK CORRECTO DE LOS ICONOS PARA QUE RENDERICE EL TEXTO Y NO EL SÍMBOLO
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: any) => <Text>{name}</Text>;
});

let mockLocalParams: any = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockLocalParams,
}));

// MOCK ESTABLE PARA EVITAR BUCLES INFINITOS
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getCurrentPositionAsync: () => Promise.resolve({ coords: { latitude: 41.38, longitude: 2.17 } }),
  watchPositionAsync: () => Promise.resolve({ remove: jest.fn() }), // Mock the subscription
  Accuracy: {
    BestForNavigation: 6, // Mock the enum value
    Highest: 5,
    High: 4,
    Balanced: 3,
    Low: 2,
    Lowest: 1,
  }
}));

jest.mock('@/components/TopBar', () => () => null);
jest.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="react-native-map" {...props} />,
    Marker: (props: any) => <View testID="rn-marker" {...props} />,
    Polyline: (props: any) => <View testID="polyline" {...props} />,
  };
});

jest.mock('react-native-maps-directions', () => {
  const { View } = require('react-native');
  return (props: any) => {
    // Simulamos que la ruta se calcula y dispara el onReady automáticamente
    if (props.onReady) {
      setTimeout(() => {
        props.onReady({
          distance: 5.2,
          duration: 12,
          coordinates: [{ latitude: 41, longitude: 2 }, { latitude: 41.1, longitude: 2.1 }]
        });
      }, 0);
    }
    return <View testID="map-view-directions" />;
  };
});

jest.mock('@/app/_components/MapWrapper', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    MapView: (props: any) => (
      <TouchableOpacity testID="map-view" onPress={props.onPress}>
        {props.children}
      </TouchableOpacity>
    ),
    Marker: (props: any) => (
      <TouchableOpacity testID="station-marker" onPress={(e: any) => {
        if(props.onPress) props.onPress({ stopPropagation: () => {} });
      }} />
    ),
  };
});

describe('InicioScreen - Flujo de Navegación y Rutas (Integration)', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = {};

    //Devuelve siempre el mismo usuario a memoria (Evita el loop de console.log(id usuari)
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@test.com' },
      isLoading: false,
    });

    (globalThis.fetch as any) = jest.fn(async () => ({
      ok: true,
      json: async () => [],
    }));
  });

  // TC1
  test('TC1: Hacer clic en el mapa selecciona un punto libre y muestra "Cómo llegar"', async () => {
    const { getByTestId, getByText } = render(<InicioScreen />);

    // Esperamos que termine el useEffect inicial tranquilamente
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', {
        nativeEvent: { coordinate: { latitude: 41.123, longitude: 2.123 } },
      });
    });

    await waitFor(() => {
      expect(getByText('Ubicación seleccionada')).toBeTruthy();
      expect(getByText('Cómo llegar')).toBeTruthy();
    });
  });

  // TC2
  test('TC2: Pulsar "Cómo llegar" lanza la alerta de opciones de origen', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId, getByText } = render(<InicioScreen />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', {
        nativeEvent: { coordinate: { latitude: 41.0, longitude: 2.0 } },
      });
    });

    const btn = await waitFor(() => getByText('Cómo llegar'));
    fireEvent.press(btn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Iniciar ruta',
      '¿Desde dónde quieres calcular la ruta?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Mi ubicación actual' }),
        expect.objectContaining({ text: 'Buscar otro origen' }),
        expect.objectContaining({ text: 'Cancelar' }),
      ])
    );
  });

  // TC3
  test('TC3: Flujo "Buscar otro origen" activa el modo selección y avisa al usuario', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', {
        nativeEvent: { coordinate: { latitude: 41.0, longitude: 2.0 } },
      });
    });

    const btn = await waitFor(() => getByText('Cómo llegar'));

    await act(async () => {
      fireEvent.press(btn);
    });

    const alertCalls = alertSpy.mock.calls;
    const alertButtons = alertCalls[0][2];
    const buscarOtroBtn = alertButtons?.find(b => b.text === 'Buscar otro origen');

    await act(async () => {
      if (buscarOtroBtn?.onPress) buscarOtroBtn.onPress();
    });

    await waitFor(() => {
      expect(getByText('Selecciona el punto de origen en el mapa')).toBeTruthy();
    });

    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', {
        nativeEvent: { coordinate: { latitude: 42.0, longitude: 3.0 } },
      });
    });

    await waitFor(() => {
      expect(queryByText('Selecciona el punto de origen en el mapa')).toBeNull();
    });
  });

  // TC4
  test('TC4: Cancelar la ruta limpia la interfaz correctamente', async () => {
    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', {
        nativeEvent: { coordinate: { latitude: 41.0, longitude: 2.0 } },
      });
    });

    const closeBtn = await waitFor(() => getByText('close'));

    await act(async () => {
      fireEvent.press(closeBtn);
    });

    await waitFor(() => {
      expect(queryByText('Ubicación seleccionada')).toBeNull();
      expect(queryByText('Cómo llegar')).toBeNull();
    });
  });

  // TC5
  test('TC5: Iniciar el modo conducción 3D oculta el botón "Iniciar"', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId, getByText, queryByText } = render(<InicioScreen />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    // 1. Clic en el mapa para marcar un destino libre
    await act(async () => {
      fireEvent(getByTestId('map-view'), 'onPress', {
        nativeEvent: { coordinate: { latitude: 41.0, longitude: 2.0 } },
      });
    });

    // 2. Darle a "Cómo llegar"
    const btn = await waitFor(() => getByText('Cómo llegar'));
    await act(async () => {
      fireEvent.press(btn);
    });

    // 3. Seleccionar "Mi ubicación actual" en la alerta para iniciar la ruta
    const alertCalls = alertSpy.mock.calls;
    const alertButtons = alertCalls[0][2];
    const miUbicacionBtn = alertButtons?.find(b => b.text === 'Mi ubicación actual');

    await act(async () => {
      if (miUbicacionBtn?.onPress) miUbicacionBtn.onPress();
    });

    // 4. El mock de MapViewDirections dispara el onReady y aparece el panel con "Iniciar"
    const iniciarBtn = await waitFor(() => getByText('Iniciar'));
    expect(iniciarBtn).toBeTruthy();

    // 5. Pulsamos "Iniciar" para pasar al modo 3D (isDrivingMode = true)
    await act(async () => {
      fireEvent.press(iniciarBtn);
    });

    // 6. Verificamos que el botón "Iniciar" desaparece de la interfaz
    await waitFor(() => {
      expect(queryByText('Iniciar')).toBeNull();
    });
  });
});
