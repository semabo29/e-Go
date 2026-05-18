import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Alert } from 'react-native';
import ShopScreen from '@/app/(tabs)/shop';

// Objeto estable en memoria para evitar re-renders infinitos en el useEffect de la tienda
const stableUser = { id: 1 };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: stableUser }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn((cb: any) => cb()),
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => ({ colorblindFriendly: false }),
}));

jest.mock('@/utils/skinsMapping', () => ({
  getSkinImage: jest.fn(() => 'mocked-image.png'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

function mockFetchJson(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('ShopScreen Integration Tests', () => {
  // Variable dinámica compartida para alterar estados de saldo sin pisar fetch destructivamente
  let customPoints = 1000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    customPoints = 1000; // Resetear puntos base en cada test

    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      const href = String(url);

      if (href.includes('/buy') || href.includes('/equip')) {
        return mockFetchJson({ message: 'Acció realitzada amb èxit', punts_restants: 500 });
      }

      if (href.includes('/conductor/')) {
        return mockFetchJson({
          inventari: [{ id: 1, nom: 'Coche Básico', preu_punts: 0, arxiu_asset: 'cotxe_basic', equipada: true }],
          punts: customPoints // Respuesta segura continua para evitar loops
        });
      }

      if (href.includes('/skins')) {
        return mockFetchJson([
          { id: 1, nom: 'Coche Básico', preu_punts: 0, arxiu_asset: 'cotxe_basic' },
          { id: 2, nom: 'Rayo Veloz', preu_punts: 500, arxiu_asset: 'coche_rayo' },
          { id: 3, nom: 'Caro', preu_punts: 5000, arxiu_asset: 'caro' }
        ]);
      }

      return mockFetchJson([]);
    }) as unknown as typeof fetch;
  });

  test('renderiza las skins y muestra los puntos del usuario', async () => {
    const { getByText } = render(<ShopScreen />);

    await waitFor(() => {
      expect(getByText('El teu Garatge')).toBeTruthy();
      expect(getByText('1000 Pts')).toBeTruthy();
      expect(getByText('Coche Básico')).toBeTruthy();
      expect(getByText('Rayo Veloz')).toBeTruthy();
      expect(getByText('Equipat')).toBeTruthy();
      expect(getByText('500 Pts')).toBeTruthy();
    });
  });

  test('muestra alerta de saldo insuficiente', async () => {
    customPoints = 100; // Alteramos el saldo de forma segura manteniendo vivas las llamadas paralelas

    const { getByText } = render(<ShopScreen />);
    const botonPrecio = await waitFor(() => getByText('5000 Pts'));
    fireEvent.press(botonPrecio);

    expect(Alert.alert).toHaveBeenCalledWith("Punts insuficients", "Et falten 4900 punts.");
  });

  test('permite comprar una skin y actualiza la UI', async () => {
    const { getByText } = render(<ShopScreen />);
    const botonPrecio = await waitFor(() => getByText('500 Pts'));

    (globalThis.fetch as any).mockImplementationOnce(async (url: string, options: RequestInit) => {
      if (url.includes('/buy') && options.method === 'POST') {
        return mockFetchJson({ message: 'Comprado', punts_restants: 500 });
      }
      return mockFetchJson({});
    });

    await act(async () => {
      fireEvent.press(botonPrecio);
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buyAction = (alertCall[2] as any[]).find(b => b.text === 'Comprar').onPress;
    
    await act(async () => {
      buyAction();
    });

    await waitFor(() => {
      expect(getByText('Equipar')).toBeTruthy();
      expect(getByText('500 Pts')).toBeTruthy();
    });
  });

  test('permite equipar una skin existente', async () => {
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      const href = String(url);
      if (href.includes('/skins') && !href.includes('/conductor')) {
        return mockFetchJson([{ id: 2, nom: 'Rayo Veloz', preu_punts: 500, arxiu_asset: 'coche_rayo' }]);
      }
      if (href.includes('/conductor/') && options?.method === undefined) {
        return mockFetchJson({ 
          inventari: [
            { id: 1, nom: 'Coche Básico', preu_punts: 0, arxiu_asset: 'cotxe_basic', equipada: true },
            { id: 2, nom: 'Rayo Veloz', preu_punts: 500, arxiu_asset: 'coche_rayo', equipada: false }
          ], 
          punts: 1000 
        });
      }
      if (href.includes('/equip') && options?.method === 'PUT') {
        return mockFetchJson({ message: 'Equipada' });
      }
      return mockFetchJson({});
    }) as unknown as typeof fetch;

    const { getByText } = render(<ShopScreen />);
    const botonEquipar = await waitFor(() => getByText('Equipar'));

    await act(async () => {
      fireEvent.press(botonEquipar);
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/skins/conductor/1/equip'),
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ skin_id: 2 }) })
      );
      expect(getByText('Equipat')).toBeTruthy();
    });
  });
});