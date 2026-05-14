import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import RankingScreen from '@/app/(tabs)/ranking';

// Mockeamos la constante de la API para que no dé errores al importar
jest.mock('@/constants/api', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('RankingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra el estado de carga inicialmente', () => {
    // Simulamos un fetch que se queda "pensando" para poder ver el loading
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    const { getByText } = render(<RankingScreen />);
    
    // Comprobamos que sale el texto del ActivityIndicator
    expect(getByText('Cargando líderes...')).toBeTruthy();
  });

  it('renderiza la lista del ranking correctamente cuando llegan los datos', async () => {
    // Simulamos la respuesta de la base de datos
    const mockData = [
      { username: 'EcoDriver_BCN', punts: 850 },
      { username: 'VoltMaster', punts: 720 },
      { username: 'ChargeKing', punts: 500 }
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      })
    ) as unknown as typeof fetch;

    const { getByText } = render(<RankingScreen />);

    // Esperamos a que el fetch termine y se pinte la pantalla
    await waitFor(() => {
      // Comprobamos que los usuarios y puntos aparecen en pantalla
      expect(getByText('EcoDriver_BCN')).toBeTruthy();
      expect(getByText('850')).toBeTruthy();
      expect(getByText('VoltMaster')).toBeTruthy();
      expect(getByText('720')).toBeTruthy();
    });
  });

  it('muestra un mensaje de vacío si no hay puntuaciones', async () => {
    // Simulamos que el backend devuelve un array vacío
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

  it('gestiona los errores de red sin "crashear"', async () => {
    // Simulamos que el servidor está caído
    global.fetch = jest.fn(() => Promise.reject(new Error('Network Error'))) as unknown as typeof fetch;

    const { getByText } = render(<RankingScreen />);

    // Esperamos a que pase el loading
    await waitFor(() => {
      // Al fallar, el estado se queda vacío, por lo que debería mostrar el mensaje por defecto
      expect(getByText('Aún no hay puntuaciones.')).toBeTruthy();
    });
  });
});