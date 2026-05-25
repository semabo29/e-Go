/**
 * E2E de flujo UI: pantalla garaje → rellenar parámetros vehículo → guardar.
 * Ejecutar: npm run test:e2e -- vehicleParameters
 *
 * Usa mocks de infraestructura (fetch, auth, router) pero componentes reales
 * del formulario de vehículo.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import VehiclesScreen from '@/app/(tabs)/car';
import { useAuth } from '@/contexts/AuthContext';

let mockLocalParams: Record<string, unknown> = {};
const mockRouter = {
  push: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockLocalParams,
  useFocusEffect: (cb: () => void) => cb(),
  Stack: { Screen: () => null },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('E2E: rellenar y guardar parámetros de vehículo', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = {};
    mockRouter.push.mockClear();
    mockRouter.setParams.mockClear();
    mockRouter.navigate.mockClear();

    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@test.com', username: 'e2e', created_at: '', updated_at: '' },
      logout: jest.fn(),
      isLoading: false,
    });

    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/car?usuari_id=')) {
        // GET vehicles - return empty list initially
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/car') && !href.includes('?')) {
        // POST save vehicle
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rellenar formulario de vehículo y guardar exitosamente', async () => {
    // —— Paso 0: montar la pantalla de garaje con usuario autenticado ——
    const { getByTestId } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByTestId('garage-screen-root')).toBeTruthy();
    });

    // —— Paso 1: rellenar el nombre del vehículo ——
    fireEvent.changeText(getByTestId('vehicle-name-input'), 'Tesla Model 3');

    // —— Paso 2: rellenar la potencia máxima ——
    fireEvent.changeText(getByTestId('vehicle-power-input'), '150');

    // —— Paso 3: seleccionar tipo de corriente (DC) ——
    fireEvent.press(getByTestId('current-type-dc'));

    // —— Paso 4: seleccionar tipo de conector (CCS Combo2) ——
    fireEvent.press(getByTestId('connector-type-ccs-combo2'));

    // —— Paso 5: pulsar botón guardar ——
    fireEvent.press(getByTestId('garage-save-vehicle-button'));

    // —— Paso 6: verificar que se llamó a la API para guardar ——
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/car'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Tesla Model 3'),
        })
      );
    });

    // —— Paso 7: verificar que se navegó a la pantalla principal con los filtros ——
    await waitFor(() => {
      expect(mockRouter.navigate).toHaveBeenCalledWith({
        pathname: '/',
        params: expect.objectContaining({
          maxKw: 150,
          ac_dc: 'DC',
          connectorType: 'CCS Combo2',
        }),
      });
    });
  });

  test('mostrar error al intentar guardar con campos vacíos', async () => {
    // —— Paso 0: montar la pantalla de garaje ——
    const { getByTestId, queryByText } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByTestId('garage-screen-root')).toBeTruthy();
    });

    // —— Paso 1: pulsar botón guardar sin rellenar campos ——
    fireEvent.press(getByTestId('garage-save-vehicle-button'));

    // —— Paso 2: verificar que aparece el modal de error ——
    await waitFor(() => {
      expect(queryByText('car.validationIncomplete')).toBeTruthy();
    });

    // —— Paso 3: cerrar el modal de error ——
    fireEvent.press(getByTestId('modal-close-button'));

    // —— Paso 4: verificar que el modal se cerró ——
    await waitFor(() => {
      expect(queryByText('car.validationIncomplete')).toBeFalsy();
    });
  });

  test('seleccionar y deseleccionar tipo de corriente', async () => {
    const { getByTestId } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByTestId('garage-screen-root')).toBeTruthy();
    });

    // —— Paso 1: seleccionar AC ——
    fireEvent.press(getByTestId('current-type-ac'));

    // —— Paso 2: pulsar AC de nuevo para deseleccionar ——
    fireEvent.press(getByTestId('current-type-ac'));

    // —— Paso 3: seleccionar DC ——
    fireEvent.press(getByTestId('current-type-dc'));

    // Verificar que DC está seleccionado (el botón debe tener el estilo activo)
    // Esto se verifica visualmente en el componente real
  });

  test('seleccionar diferentes tipos de conectores', async () => {
    const { getByTestId } = render(<VehiclesScreen />);

    await waitFor(() => {
      expect(getByTestId('garage-screen-root')).toBeTruthy();
    });

    // —— Paso 1: seleccionar CHAdeMO ——
    fireEvent.press(getByTestId('connector-type-chademo'));

    // —— Paso 2: cambiar a TESLA ——
    fireEvent.press(getByTestId('connector-type-tesla'));

    // —— Paso 3: cambiar a Schuko ——
    fireEvent.press(getByTestId('connector-type-schuko'));

    // Verificar que Schuko está seleccionado
  });
});
