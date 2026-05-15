import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import RankingScreen from '@/app/(tabs)/ranking';

jest.mock('@/constants/api', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => ({
    colorblindFriendly: false,
    isLoaded: true,
    setColorblindFriendly: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => createElement(Text, null, name);
});

describe('RankingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Fetch pendiente: debe mostrarse el indicador de carga.
  it('muestra el estado de carga inicialmente', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    const { getByText } = render(<RankingScreen />);

    expect(getByText('Cargando líderes...')).toBeTruthy();
  });

  // Respuesta OK del backend: lista usuarios y puntos.
  it('renderiza la lista del ranking correctamente cuando llegan los datos', async () => {
    const mockData = [
      { id: 1, username: 'EcoDriver_BCN', punts: 850 },
      { id: 2, username: 'VoltMaster', punts: 720 },
      { id: 3, username: 'ChargeKing', punts: 500 },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      })
    ) as unknown as typeof fetch;

    const { getByText } = render(<RankingScreen />);

    await waitFor(() => {
      expect(getByText('EcoDriver_BCN')).toBeTruthy();
      expect(getByText('850')).toBeTruthy();
      expect(getByText('VoltMaster')).toBeTruthy();
      expect(getByText('720')).toBeTruthy();
    });
  });

  // Array vacío: mensaje de ranking sin datos.
  it('muestra un mensaje de vacío si no hay puntuaciones', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      })
    ) as unknown as typeof fetch;

    const { getByText } = render(<RankingScreen />);

    await waitFor(() => {
      expect(getByText('Aún no hay puntuaciones.')).toBeTruthy();
    });
  });

  // Error de red: no crashea y muestra el estado vacío.
  it('gestiona los errores de red sin "crashear"', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network Error'))) as unknown as typeof fetch;

    const { getByText } = render(<RankingScreen />);

    await waitFor(() => {
      expect(getByText('Aún no hay puntuaciones.')).toBeTruthy();
    });
  });
});
