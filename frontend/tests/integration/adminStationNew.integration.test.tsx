import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockBack = jest.fn();
const mockLocalSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockLocalSearchParams,
}));

jest.mock('@/app/_components/MapWrapper', () => ({
  MapView: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'map-view' }, children);
  },
  Marker: () => null,
}));

jest.mock('@/services/geoService', () => ({
  searchGeoAddress: jest.fn().mockResolvedValue([]),
  reverseGeoAddress: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/constants/catalunyaMunicipalities.json', () => ({
  Barcelona: ['Barcelona', 'Badalona'],
  Girona: ['Girona'],
  Lleida: ['Lleida'],
  Tarragona: ['Tarragona'],
}));

jest.mock('@/services/stationModeration', () => ({
  createAdminStation: jest.fn(),
  updateAdminStation: jest.fn(),
}));

import AdminStationNewScreen from '@/app/admin-station-new';
import { createAdminStation, updateAdminStation } from '@/services/stationModeration';

function makeMockResponse(ok: boolean, data: object, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: async () => data,
  } as any;
}

describe('AdminStationNewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockLocalSearchParams)) {
      delete mockLocalSearchParams[key];
    }
  });

  describe('Create mode', () => {
    test('renders create title and submit label', () => {
      const { getByText } = render(<AdminStationNewScreen />);
      expect(getByText('Nueva estacion manual')).toBeTruthy();
      expect(getByText('Crear estacion')).toBeTruthy();
    });

    test('back button calls router.back', () => {
      const { getByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Volver'));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    test('submit creates station and shows success', async () => {
      (createAdminStation as jest.Mock).mockResolvedValue(makeMockResponse(true, { id: 1 }));
      const { getByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Crear estacion'));
      await waitFor(() => {
        expect(getByText('Estacion creada correctamente')).toBeTruthy();
      });
      expect(createAdminStation).toHaveBeenCalledTimes(1);
    });

    test('submit shows error from API', async () => {
      (createAdminStation as jest.Mock).mockResolvedValue(makeMockResponse(false, { error: 'Campos requeridos' }));
      const { getByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Crear estacion'));
      await waitFor(() => {
        expect(getByText('Campos requeridos')).toBeTruthy();
      });
    });

    test('submit shows fallback error when API error is empty', async () => {
      (createAdminStation as jest.Mock).mockResolvedValue(makeMockResponse(false, {}));
      const { getByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Crear estacion'));
      await waitFor(() => {
        expect(getByText('No se pudo guardar la estacion')).toBeTruthy();
      });
    });

    test('submit shows NO_SESSION error', async () => {
      (createAdminStation as jest.Mock).mockRejectedValue(new Error('NO_SESSION'));
      const { getByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Crear estacion'));
      await waitFor(() => {
        expect(getByText('No hay sesion admin')).toBeTruthy();
      });
    });

    test('submit shows generic network error', async () => {
      (createAdminStation as jest.Mock).mockRejectedValue(new Error('Network error'));
      const { getByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Crear estacion'));
      await waitFor(() => {
        expect(getByText('No se pudo conectar con el servidor')).toBeTruthy();
      });
    });

    test('typing in name input clears previous error', async () => {
      (createAdminStation as jest.Mock).mockResolvedValue(makeMockResponse(false, { error: 'Error previo' }));
      const { getByText, getByPlaceholderText, queryByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Crear estacion'));
      await waitFor(() => expect(getByText('Error previo')).toBeTruthy());
      fireEvent.changeText(getByPlaceholderText('Nombre de la estacion'), 'Nueva estacion');
      await waitFor(() => expect(queryByText('Error previo')).toBeNull());
    });
  });

  describe('Edit mode', () => {
    beforeEach(() => {
      Object.assign(mockLocalSearchParams, {
        mode: 'edit',
        id: '42',
        nom: 'Estacion Edit',
        latitud: '41.5',
        longitud: '2.1',
        kw: '22',
        ac_dc: 'AC',
        tipus_connexio: 'MENNEKES.M',
        tipus_velocitat: 'Normal',
        adreca: 'Calle Test 1',
        municipi: 'Barcelona',
        provincia: 'Barcelona',
        promotor: 'Test SA',
        acces: 'Publico',
      });
    });

    test('renders edit title and submit label', () => {
      const { getByText } = render(<AdminStationNewScreen />);
      expect(getByText('Editar estacion manual')).toBeTruthy();
      expect(getByText('Guardar cambios')).toBeTruthy();
    });

    test('pre-fills form from route params', async () => {
      const { getByPlaceholderText } = render(<AdminStationNewScreen />);
      await waitFor(() => {
        expect(getByPlaceholderText('Nombre de la estacion').props.value).toBe('Estacion Edit');
      });
    });

    test('submit updates station and shows success', async () => {
      (updateAdminStation as jest.Mock).mockResolvedValue(makeMockResponse(true, { id: 42 }));
      const { getByText } = render(<AdminStationNewScreen />);
      await waitFor(() => expect(getByText('Guardar cambios')).toBeTruthy());
      fireEvent.press(getByText('Guardar cambios'));
      await waitFor(() => {
        expect(getByText('Estacion actualizada')).toBeTruthy();
      });
      expect(updateAdminStation).toHaveBeenCalledWith(42, expect.anything());
    });

    test('submit shows error from API in edit mode', async () => {
      (updateAdminStation as jest.Mock).mockResolvedValue(makeMockResponse(false, { error: 'Sin permisos' }));
      const { getByText } = render(<AdminStationNewScreen />);
      await waitFor(() => expect(getByText('Guardar cambios')).toBeTruthy());
      fireEvent.press(getByText('Guardar cambios'));
      await waitFor(() => {
        expect(getByText('Sin permisos')).toBeTruthy();
      });
    });
  });

  describe('Edit mode with invalid ID', () => {
    test('shows error for invalid station ID', async () => {
      Object.assign(mockLocalSearchParams, { mode: 'edit', id: 'notanumber' });
      const { getByText } = render(<AdminStationNewScreen />);
      fireEvent.press(getByText('Guardar cambios'));
      await waitFor(() => {
        expect(getByText('ID de estacion invalido')).toBeTruthy();
      });
    });
  });
});