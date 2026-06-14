import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import MyFavoriteStationsScreen from '@/app/my-favorite-stations';
import { useAuth } from '@/contexts/AuthContext';
import { appFetch } from '@/services/appFetch';

// --- 1. MOCKS ---
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => ({ colorblindFriendly: false }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/services/appFetch', () => ({
  appFetch: jest.fn(),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

// --- 2. DADES DE PROVA ---
const mockUser = { id: 1, email: 'test@test.com', username: 'test' };

const mockStations = [
  {
    id: 10,
    nom: 'Estació Central',
    municipi: 'Barcelona',
    adreca: 'Carrer Fals 123',
    kw: '50',
    latitud: '41.38',
    longitud: '2.17',
  },
  {
    id: 11,
    nom: 'Estació Nord',
    municipi: 'Girona',
    adreca: 'Avinguda Nord 45',
    kw: '22',
    latitud: '41.98',
    longitud: '2.82',
  }
];

// --- 3. BATERIA DE TESTS ---
describe('MyFavoriteStationsScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  test('mostra el text de càrrega inicialment i després renderitza les estacions', async () => {
    (appFetch as jest.Mock).mockImplementation(async () => ({
      ok: true,
      json: async () => [...mockStations],
    }));

    const { getByText, queryByText } = render(<MyFavoriteStationsScreen />);

    expect(getByText('Cargando estaciones...')).toBeTruthy();

    await waitFor(() => {
      expect(queryByText('Cargando estaciones...')).toBeNull();
    });

    expect(getByText('Estació Central')).toBeTruthy();
    expect(getByText('Estació Nord')).toBeTruthy();
    expect(appFetch).toHaveBeenCalledWith(`/favorites?usuari_id=${mockUser.id}`, expect.any(Object));
  });

  test('mostra estat buit si no hi ha favorits', async () => {
    (appFetch as jest.Mock).mockImplementation(async () => ({
      ok: true,
      json: async () => [],
    }));

    const { getByText } = render(<MyFavoriteStationsScreen />);

    await waitFor(() => {
      expect(getByText('No tienes estaciones favoritas')).toBeTruthy();
    });
  });

  test('permet seleccionar i deseleccionar múltiples estacions adequadament', async () => {
    (appFetch as jest.Mock).mockImplementation(async () => ({
      ok: true,
      json: async () => [...mockStations],
    }));

    const { getByText, queryByText } = render(<MyFavoriteStationsScreen />);

    await waitFor(() => expect(getByText('Estació Central')).toBeTruthy());

    expect(queryByText(/Eliminar \(/)).toBeNull();

    fireEvent.press(getByText('Estació Central'));
    expect(getByText('Eliminar (1)')).toBeTruthy();

    fireEvent.press(getByText('Estació Nord'));
    expect(getByText('Eliminar (2)')).toBeTruthy();

    fireEvent.press(getByText('Estació Central'));
    expect(getByText('Eliminar (1)')).toBeTruthy();
  });

  test('el botó "Cargar" envia al router els paràmetres autoSelectStationId', async () => {
    (appFetch as jest.Mock).mockImplementation(async () => ({
      ok: true,
      json: async () => [...mockStations],
    }));

    const { getAllByText, getByText } = render(<MyFavoriteStationsScreen />);

    await waitFor(() => expect(getByText('Estació Central')).toBeTruthy());

    const loadButtons = getAllByText('Cargar');
    fireEvent.press(loadButtons[0]);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/',
      params: { autoSelectStationId: '10' },
    });
  });

  test('elimina correctament una estació seleccionada si es confirma el diàleg', async () => {
    (appFetch as jest.Mock).mockImplementation(async (url: any, options?: any) => {
      if (options?.method === 'DELETE') {
        return { ok: true };
      }
      return { ok: true, json: async () => [...mockStations] };
    });

    // Guardarem l'acció d'esborrar en una variable per executar-la manualment dins d'un `act`
    let confirmDelete: (() => Promise<void>) | undefined;

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      if (title === 'Confirmar eliminación' && buttons && buttons.length > 1) {
        confirmDelete = buttons[1].onPress as () => Promise<void>;
      }
    });

    const { getByText, queryByText } = render(<MyFavoriteStationsScreen />);

    await waitFor(() => expect(getByText('Estació Central')).toBeTruthy());

    // Seleccionem l'estació
    fireEvent.press(getByText('Estació Central'));

    // Fem clic a Eliminar (mostra l'Alert)
    fireEvent.press(getByText('Eliminar (1)'));

    // Comprovem que l'Alert s'ha obert
    expect(alertSpy).toHaveBeenCalledWith(
      'Confirmar eliminación',
      '¿Eliminar 1 estación?',
      expect.any(Array)
    );

    // Executem l'onPress (que fa la crida HTTP) garantint que React processi les promeses abans d'avançar
    await act(async () => {
      if (confirmDelete) {
        await confirmDelete();
      }
    });

    // Ara l'actualització del DOM estarà finalitzada i l'estació desapareixerà correctament
    await waitFor(() => {
      expect(queryByText('Estació Central')).toBeNull();
      expect(getByText('Estació Nord')).toBeTruthy();
    });

    // Validem el payload
    expect(appFetch).toHaveBeenCalledWith('/favorites', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ usuari_id: mockUser.id, estacio_id: 10 }),
    }));

    alertSpy.mockRestore();
  });

  test('el botó "Cómo llegar" envia al router els paràmetres per iniciar la ruta', async () => {
    // 1. Simulem que el backend retorna les estacions
    (appFetch as jest.Mock).mockImplementation(async () => ({
      ok: true,
      json: async () => [...mockStations],
    }));

    // 2. Renderitzem la pantalla
    const { getAllByText, getByText } = render(<MyFavoriteStationsScreen />);
    await waitFor(() => expect(getByText('Estació Central')).toBeTruthy());

    // 3. Busquem els botons de ruta i cliquem el de la primera estació (Estació Central)
    const routeButtons = getAllByText('Cómo llegar');
    fireEvent.press(routeButtons[0]);

    // 4. Comprovem que s'ha cridat a navigate amb la URL i coordenades exactes
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/',
      params: {
        action: 'start_route_from_fav',
        destLat: '41.38',
        destLng: '2.17'
      },
    });
  });
});