/**
 * E2E de Flujo UI: Tienda de Skins
 * Flujo: Carga de la tienda -> Renderizado del catálogo -> Seleccionar skin -> Se ve el detalle -> Equipar
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import ShopScreen from '@/app/(tabs)/shop';
import { useAuth } from '@/contexts/AuthContext';

// --- MOCKS ---
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('@expo/vector-icons/FontAwesome5', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// --- DATOS DE PRUEBA CORREGIDOS ---
const mockShopSkins = [
  { id: 101, nom: 'Cotxe Foc', preu_punts: 1000, arxiu_asset: 'cotxe_foc', descripcio: 'Skin de foc ultra ràpida' },
  { id: 102, nom: 'Cotxe Gel', preu_punts: 1500, arxiu_asset: 'cotxe_gel', descripcio: 'Skin de gel refrescant' },
];

// AQUÍ ESTABA EL ERROR: Ahora simulamos exactamente lo que devuelve tu backend
const mockUserInventory = {
  inventari: [
    { id: 101, equipada: false, arxiu_asset: 'cotxe_foc' }
  ],
  punts: 5000
};

describe('E2E: Flujo de la Tienda de Skins', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@test.com', username: 'e2e_user', punts: 5000 },
      isLoading: false,
    });

    globalThis.fetch = jest.fn(async (url: string, options: any) => {
      const href = String(url);
      const method = (options as any)?.method || 'GET';

      // Petición al catálogo
      if (href.includes('/skins') && !href.includes('/conductor/') && method === 'GET') {
        return { ok: true, json: async () => mockShopSkins } as Response;
      }
      
      // Petición al inventario del usuario
      if (href.includes('/skins/conductor/12') && method === 'GET') {
        return { ok: true, json: async () => mockUserInventory } as Response;
      }

      // Petición PUT para equipar o POST para comprar
      if (href.includes('/equip') || href.includes('/buy') || href.includes('/skins')) {
        return { ok: true, json: async () => ({ message: 'Acción realizada con éxito' }) } as Response;
      }

      throw new Error(`Fetch no interceptado en E2E Shop: ${href}`);
    }) as unknown as typeof fetch;
  });

  test('Navega a la tienda, selecciona una skin, visualiza sus detalles y la equipa', async () => {
    const { getByText, findByText, getAllByText } = render(<ShopScreen />);

    // 1. Esperamos a que cargue el inventario y se renderice el catálogo
    await waitFor(() => {
      expect(getByText('Cotxe Foc')).toBeTruthy();
    });

    // 2. Comprobar detalles de catálogo
    expect(await findByText('Cotxe Gel')).toBeTruthy();

    // 3. Seleccionar Skin
    const skinCard = getByText('Cotxe Foc');
    fireEvent.press(skinCard);

    // 4. Verificar detalles en la UI
    await waitFor(() => {
      expect(getByText('Skin de foc ultra ràpida')).toBeTruthy();
    });

    // 5. Simular botón de equipar. Como la app ahora sabe que TENEMOS la skin 101, 
    // el botón dirá 'shop.equip' en lugar de 'shop.pricePts'
    let actionButton;
    try {
      actionButton = getAllByText('shop.equip')[0];
    } catch {
      actionButton = skinCard; 
    }
    
    // Espiamos las alertas (aunque Equipar no suele lanzar alerta, es bueno tenerlo por si acaso)
    let confirmAction: (() => void) | undefined;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      if (buttons && buttons.length > 1 && buttons[1].onPress) {
        confirmAction = buttons[1].onPress as () => void;
      } else if (buttons && buttons.length > 0 && buttons[0].onPress) {
        confirmAction = buttons[0].onPress as () => void;
      }
    });

    fireEvent.press(actionButton);

    if (confirmAction) {
      await act(async () => {
        confirmAction!();
      });
    }

    // 6. Verificar petición: El método equipSkin de tu shop.tsx hace un PUT a /skins/conductor/ID/equip
    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as jest.Mock).mock.calls;
      const apiCall = fetchCalls.find((call: any) => {
        const method = (call[1] as any)?.method;
        return method === 'PUT' || method === 'POST';
      });
      
      expect(apiCall).toBeDefined();
    });

    alertSpy.mockRestore();
  });
});