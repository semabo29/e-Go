import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import VehiclesScreen from '@/app/(tabs)/car';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, TextInput } from 'react-native';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockStackScreen = jest.fn();

let mockParams: any = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
    push: mockPush,
  }),
  Stack: {
    Screen: () => {
      mockStackScreen();
      return null;
    },
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

function mockFetchJson(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('VehiclesScreen (car/garage) integration (mocked fetch/router)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as unknown as jest.Mock).mockReturnValue({
      user: { id: 1, email: 'u@test.com', username: 'u', created_at: '', updated_at: '' },
      logout: jest.fn(),
      isLoading: false,
      setUser: jest.fn(),
    });

    mockParams = {};

    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      // Initial load: GET /car?usuari_id=1
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return mockFetchJson([
          {
            usuari_id: 1,
            nom: 'Car Test 1',
            kw: '100',
            ac_dc: 'AC',
            tipus_connexio: 'CCS Combo2',
          },
        ]);
      }

      // Save car: POST /car
      if (url.includes('/car') && options?.method === 'POST') {
        return mockFetchJson({}, true, 201);
      }

      // Default fallback
      return mockFetchJson([]);
    }) as unknown as typeof fetch;
  });

  // Si intentas guardar con campos vacíos, debe mostrarse el modal de error
  // y no debe llamarse a la API con POST `/car`.
  test('shows error modal when saving with empty fields', async () => {
    mockParams = {};
    const { getByText } = render(<VehiclesScreen />);

    fireEvent.press(getByText('Guardar vehículo'));

    await waitFor(() => {
      expect(
        getByText(
          'Los vehículos deben estar completamente especificados (nombre, potencia, tipo de conector y de corriente)'
        )
      ).toBeTruthy();
    });

    expect(globalThis.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/car'), expect.any(Object));
  });

  // hace POST `/car` y navega a la pantalla index con los parametros esperados.
  test('saves car successfully and navigates with expected params', async () => {
    mockParams = {};

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return { json: async () => [] } as any;
      }
      if (url.includes('/car') && options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({}) } as any;
      }
      return { json: async () => [] } as any;
    });

    const { getByText, UNSAFE_getAllByType } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByText('Nuevo vehículo')).toBeTruthy();
    });

    const textInputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(textInputs[0], 'Nuevo vehículo test');
    fireEvent.changeText(textInputs[1], '100');
    fireEvent.press(getByText('AC'));
    fireEvent.press(getByText('CCS Combo2'));

    fireEvent.press(getByText('Guardar vehículo'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/car'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/',
        params: {
          maxKw: 100,
          ac_dc: 'AC',
          connectorType: 'CCS Combo2',
        },
      });
    });

    const fetchMock = globalThis.fetch as unknown as jest.Mock;
    await waitFor(() => {
      const getCalls = fetchMock.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('/car?usuari_id=1')).length;
      expect(getCalls).toBeGreaterThanOrEqual(2); // carga inicial + refresco tras guardar
    });
  });

  // Si falla el fetch inicial de `/car?usuari_id=...`, la pantalla no debe crashear
  // y la lista de vehículos debe mantenerse vacía.
  test('initial vehicles fetch reject: does not crash and keeps list empty', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/car?usuari_id=1')) {
        throw new Error('network failed');
      }
      return { json: async () => [] } as any;
    });

    const { queryByText, getByText } = render(<VehiclesScreen />);

    // Screen still renders its "Nuevo vehículo" state.
    expect(getByText('Nuevo vehículo')).toBeTruthy();

    await waitFor(() => {
      expect(queryByText('Car Test 1')).toBeNull();
    });
  });

  // Si la API devuelve múltiples vehículos, deben renderizarse todos en la lista.
  test('renders multiple vehicles returned by GET /car', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return {
          json: async () => [
            {
              usuari_id: 1,
              nom: 'Car Test 1',
              kw: '100',
              ac_dc: 'AC',
              tipus_connexio: 'CCS Combo2',
            },
            {
              usuari_id: 1,
              nom: 'Car Test 2',
              kw: '50',
              ac_dc: 'DC',
              tipus_connexio: 'CCS Combo2',
            },
          ],
        } as any;
      }

      if (url.includes('/car') && options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({}) } as any;
      }

      return { json: async () => [] } as any;
    });

    const { getByText } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByText('Car Test 1')).toBeTruthy();
      expect(getByText('Car Test 2')).toBeTruthy();
    });
  });

  // Eliminación exitosa: hace DELETE `/car` y luego refresca la lista llamando de nuevo
  // a GET `/car?usuari_id=...`.
  test('delete vehicle success: calls DELETE /car and refreshes list', async () => {
    let vehicles: any[] = [
      {
        usuari_id: 1,
        nom: 'Car Test 1',
        kw: '100',
        ac_dc: 'AC',
        tipus_connexio: 'CCS Combo2',
      },
    ];

    const fetchMock = jest.fn(async (url: string, options?: RequestInit) => {
      // Initial load: GET /car?usuari_id=1
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return mockFetchJson(vehicles);
      }

      // Delete: DELETE /car
      if (url.includes('/car') && options?.method === 'DELETE') {
        const body = options.body ? JSON.parse(options.body as string) : {};
        expect(body.usuari_id).toBe(1);
        expect(body.v_nom).toBe('Car Test 1');

        vehicles = [];
        return mockFetchJson({});
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    (globalThis.fetch as any) = fetchMock;

    const { getByText, queryByText } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByText('Car Test 1')).toBeTruthy();
    });

    const alertSpy = jest.spyOn(Alert, 'alert');

    await act(async () => {
      fireEvent.press(getByText('Eliminar vehículo'));
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (c) => typeof c[0] === 'string' && c[0].includes('/car') && c[1]?.method === 'DELETE'
        )
      ).toBe(true);
    });

    await waitFor(() => {
      expect(alertSpy).not.toHaveBeenCalled();
      expect(queryByText('Car Test 1')).toBeNull();
    }, { timeout: 5000 });

    const getCalls = fetchMock.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('/car?usuari_id=1')).length;
    expect(getCalls).toBeGreaterThanOrEqual(2); // initial load + refresh after delete
  });

  // Eliminación no-ok: debe mostrar un Alert con el mensaje de fallo.
  test('delete vehicle server non-ok: shows Alert message', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return {
          json: async () => [
            {
              usuari_id: 1,
              nom: 'Car Test 1',
              kw: '100',
              ac_dc: 'AC',
              tipus_connexio: 'CCS Combo2',
            },
          ],
        } as any;
      }

      if (url.includes('/car') && options?.method === 'DELETE') {
        return { ok: false, status: 400, json: async () => ({}) } as any;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByText('Car Test 1')).toBeTruthy();
    });

    fireEvent.press(getByText('Eliminar vehículo'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'No se ha podido eliminar el vehículo');
    });

    alertSpy.mockRestore();
  });

  // Eliminación con fallo de red (catch): debe mostrar un Alert de "Error de conexión".
  test('delete vehicle network error: shows connection Alert', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return {
          json: async () => [
            {
              usuari_id: 1,
              nom: 'Car Test 1',
              kw: '100',
              ac_dc: 'AC',
              tipus_connexio: 'CCS Combo2',
            },
          ],
        } as any;
      }

      if (url.includes('/car') && options?.method === 'DELETE') {
        throw new Error('network failed');
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByText('Car Test 1')).toBeTruthy();
    });

    fireEvent.press(getByText('Eliminar vehículo'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Error de conexión');
    });

    alertSpy.mockRestore();
  });

  // Guardado no-ok: debe mostrar un Alert con el mensaje de fallo al guardar.
  test('save car server non-ok: shows Alert message', async () => {
    mockParams = {
      potencia: '100',
      connectorType: 'CCS Combo2',
      ac_dc: 'AC',
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      // Initial vehicles load (can be empty)
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return { json: async () => [] } as any;
      }

      // POST save car fails
      if (url.includes('/car') && options?.method === 'POST') {
        return { ok: false, status: 500, json: async () => ({}) } as any;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText, UNSAFE_getAllByType } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByText('Nuevo vehículo')).toBeTruthy();
    });

    const textInputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(textInputs[0], 'Nombre para guardar');
    fireEvent.changeText(textInputs[1], '100');
    fireEvent.press(getByText('AC'));
    fireEvent.press(getByText('CCS Combo2'));

    fireEvent.press(getByText('Guardar vehículo'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'No se ha podido guardar el vehículo');
    });

    alertSpy.mockRestore();
  });

  // Guardado con fallo de red (catch): debe mostrar un Alert de "Error de conexión".
  test('save car network error: shows connection Alert', async () => {
    mockParams = {
      potencia: '100',
      connectorType: 'CCS Combo2',
      ac_dc: 'AC',
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/car?usuari_id=1') && options?.method === undefined) {
        return { json: async () => [] } as any;
      }

      if (url.includes('/car') && options?.method === 'POST') {
        throw new Error('network failed');
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText, UNSAFE_getAllByType } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByText('Nuevo vehículo')).toBeTruthy();
    });

    const textInputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(textInputs[0], 'Nombre para guardar');
    fireEvent.changeText(textInputs[1], '100');
    fireEvent.press(getByText('AC'));
    fireEvent.press(getByText('CCS Combo2'));

    fireEvent.press(getByText('Guardar vehículo'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Error de conexión');
    });

    alertSpy.mockRestore();
  });
});

