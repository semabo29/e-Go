/**
 * E2E de Flujo UI: Ranking
 * Flujo: Carga de la pestaña -> Petición a la API -> Renderizado de la lista de ranking.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import RankingScreen from '@/app/(tabs)/ranking';
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

// Mockeamos iconos y traducciones para simplificar
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

// --- DATOS DE PRUEBA ---
const mockRankingData = [
  { id: 1, username: 'Hamilton', punts: 5000, is_premium: true },
  { id: 12, username: 'e2e_user', punts: 3500, is_premium: false },
  { id: 3, username: 'Alonso', punts: 2000, is_premium: false },
];

describe('E2E: Flujo de Ranking', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@test.com', username: 'e2e_user' },
      isLoading: false,
    });

    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      // Condición más relajada para atrapar cualquier llamada al ranking
      if (href.includes('ranking')) {
        return { ok: true, json: async () => mockRankingData } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;
  });

  test('Abre la pestaña de Ranking, hace el fetch y muestra la lista de conductores', async () => {
    const { getByText, findByText } = render(<RankingScreen />);

    // 1. Verificamos que se hace la llamada al servidor
    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as jest.Mock).mock.calls;
      const rankingCall = fetchCalls.find((call: any) => String(call[0]).includes('ranking'));
      expect(rankingCall).toBeDefined();
    });

    // 2. Verificamos que los datos se renderizan en la pantalla
    expect(await findByText('Hamilton')).toBeTruthy();
    expect(getByText('5000')).toBeTruthy();

    expect(getByText('e2e_user')).toBeTruthy();
    expect(getByText('3500')).toBeTruthy();
    
    expect(getByText('Alonso')).toBeTruthy();
  });
});