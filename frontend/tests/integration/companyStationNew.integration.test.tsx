import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
  requestCreateCompanyStation: jest.fn(),
  requestUpdateCompanyStation: jest.fn(),
}));

jest.mock('@/services/companyProfile', () => ({
  fetchCompanyProfile: jest.fn(),
}));

jest.mock('@/services/privilegedAuth', () => ({
  getPrivilegedUser: jest.fn(),
}));

import CompanyStationNewScreen from '@/app/company-station-new';
import { requestCreateCompanyStation, requestUpdateCompanyStation } from '@/services/stationModeration';
import { fetchCompanyProfile } from '@/services/companyProfile';
import { getPrivilegedUser } from '@/services/privilegedAuth';

function makeMockResponse(ok: boolean, data: object, status = ok ? 200 : 400) {
  return { ok, status, json: async () => data } as any;
}

describe('CompanyStationNewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockLocalSearchParams)) {
      delete mockLocalSearchParams[key];
    }
    (getPrivilegedUser as jest.Mock).mockResolvedValue(null);
    (fetchCompanyProfile as jest.Mock).mockResolvedValue({ nombre: null });
  });

  describe('Create mode', () => {
    test('renders create title and submit label', () => {
      const { getByText } = render(<CompanyStationNewScreen />);
      expect(getByText('Solicitar nueva estacion')).toBeTruthy();
      expect(getByText('Enviar solicitud de alta')).toBeTruthy();
    });

    test('back button calls router.back', () => {
      const { getByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Volver'));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    test('pre-fills promotor from stored user', async () => {
      (getPrivilegedUser as jest.Mock).mockResolvedValue({ nombre: 'Mi Empresa' });
      const { getByPlaceholderText } = render(<CompanyStationNewScreen />);
      await waitFor(() => {
        expect(getByPlaceholderText('Promotor/gestor').props.value).toBe('Mi Empresa');
      });
    });

    test('pre-fills promotor from company profile when not stored', async () => {
      (getPrivilegedUser as jest.Mock).mockResolvedValue(null);
      (fetchCompanyProfile as jest.Mock).mockResolvedValue({ nombre: 'Profile Empresa' });
      const { getByPlaceholderText } = render(<CompanyStationNewScreen />);
      await waitFor(() => {
        expect(getByPlaceholderText('Promotor/gestor').props.value).toBe('Profile Empresa');
      });
    });

    test('does not override promotor if already filled', async () => {
      (getPrivilegedUser as jest.Mock).mockResolvedValue({ nombre: 'Mi Empresa' });
      const { getByPlaceholderText } = render(<CompanyStationNewScreen />);
      fireEvent.changeText(getByPlaceholderText('Promotor/gestor'), 'Otro promotor');
      await waitFor(() => {
        expect(getByPlaceholderText('Promotor/gestor').props.value).toBe('Otro promotor');
      });
    });

    test('submit creates station request and shows success', async () => {
      (requestCreateCompanyStation as jest.Mock).mockResolvedValue(makeMockResponse(true, { id: 5 }));
      const { getByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Enviar solicitud de alta'));
      await waitFor(() => {
        expect(getByText('Solicitud de alta enviada')).toBeTruthy();
      });
      expect(requestCreateCompanyStation).toHaveBeenCalledTimes(1);
    });

    test('shows error from API on create', async () => {
      (requestCreateCompanyStation as jest.Mock).mockResolvedValue(makeMockResponse(false, { error: 'Datos invalidos' }));
      const { getByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Enviar solicitud de alta'));
      await waitFor(() => {
        expect(getByText('Datos invalidos')).toBeTruthy();
      });
    });

    test('shows fallback error when API error field is empty', async () => {
      (requestCreateCompanyStation as jest.Mock).mockResolvedValue(makeMockResponse(false, {}));
      const { getByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Enviar solicitud de alta'));
      await waitFor(() => {
        expect(getByText('No se pudo enviar la solicitud')).toBeTruthy();
      });
    });

    test('shows NO_SESSION error', async () => {
      (requestCreateCompanyStation as jest.Mock).mockRejectedValue(new Error('NO_SESSION'));
      const { getByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Enviar solicitud de alta'));
      await waitFor(() => {
        expect(getByText('No hay sesion de empresa')).toBeTruthy();
      });
    });

    test('shows generic network error', async () => {
      (requestCreateCompanyStation as jest.Mock).mockRejectedValue(new Error('timeout'));
      const { getByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Enviar solicitud de alta'));
      await waitFor(() => {
        expect(getByText('No se pudo conectar con el servidor')).toBeTruthy();
      });
    });

    test('typing clears previous error', async () => {
      (requestCreateCompanyStation as jest.Mock).mockResolvedValue(makeMockResponse(false, { error: 'Error previo' }));
      const { getByText, getByPlaceholderText, queryByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Enviar solicitud de alta'));
      await waitFor(() => expect(getByText('Error previo')).toBeTruthy());
      fireEvent.changeText(getByPlaceholderText('Nombre de la estacion'), 'X');
      await waitFor(() => expect(queryByText('Error previo')).toBeNull());
    });

    test('after successful create, resets form keeping company name', async () => {
      (getPrivilegedUser as jest.Mock).mockResolvedValue({ nombre: 'Mi Empresa' });
      (requestCreateCompanyStation as jest.Mock).mockResolvedValue(makeMockResponse(true, { id: 5 }));
      const { getByText, getByPlaceholderText } = render(<CompanyStationNewScreen />);
      await waitFor(() => expect(getByPlaceholderText('Promotor/gestor').props.value).toBe('Mi Empresa'));
      fireEvent.changeText(getByPlaceholderText('Nombre de la estacion'), 'Estacion Temp');
      fireEvent.press(getByText('Enviar solicitud de alta'));
      await waitFor(() => {
        expect(getByText('Solicitud de alta enviada')).toBeTruthy();
        expect(getByPlaceholderText('Nombre de la estacion').props.value).toBe('');
      });
    });
  });

  describe('Edit mode', () => {
    beforeEach(() => {
      Object.assign(mockLocalSearchParams, {
        mode: 'edit',
        id: '10',
        nom: 'Estacion Empresa',
        latitud: '41.4',
        longitud: '2.2',
        kw: '11',
        ac_dc: 'AC',
        tipus_connexio: 'CCS2',
        tipus_velocitat: 'Rapid',
        adreca: 'Calle Empresa 1',
        municipi: 'Badalona',
        provincia: 'Barcelona',
        promotor: 'Empresa SA',
        acces: 'Privado',
      });
    });

    test('renders edit title and submit label', () => {
      const { getByText } = render(<CompanyStationNewScreen />);
      expect(getByText('Solicitar edicion de estacion')).toBeTruthy();
      expect(getByText('Enviar solicitud de edicion')).toBeTruthy();
    });

    test('pre-fills form from route params in edit mode', async () => {
      const { getByPlaceholderText } = render(<CompanyStationNewScreen />);
      await waitFor(() => {
        expect(getByPlaceholderText('Nombre de la estacion').props.value).toBe('Estacion Empresa');
      });
    });

    test('submit updates station request and shows success', async () => {
      (requestUpdateCompanyStation as jest.Mock).mockResolvedValue(makeMockResponse(true, { id: 10 }));
      const { getByText } = render(<CompanyStationNewScreen />);
      await waitFor(() => expect(getByText('Enviar solicitud de edicion')).toBeTruthy());
      fireEvent.press(getByText('Enviar solicitud de edicion'));
      await waitFor(() => {
        expect(getByText('Solicitud de actualizacion enviada')).toBeTruthy();
      });
      expect(requestUpdateCompanyStation).toHaveBeenCalledWith(10, expect.anything());
    });

    test('shows error from API in edit mode', async () => {
      (requestUpdateCompanyStation as jest.Mock).mockResolvedValue(makeMockResponse(false, { error: 'Sin permiso' }));
      const { getByText } = render(<CompanyStationNewScreen />);
      await waitFor(() => expect(getByText('Enviar solicitud de edicion')).toBeTruthy());
      fireEvent.press(getByText('Enviar solicitud de edicion'));
      await waitFor(() => {
        expect(getByText('Sin permiso')).toBeTruthy();
      });
    });
  });

  describe('Edit mode with invalid ID', () => {
    test('shows error for invalid station ID', async () => {
      Object.assign(mockLocalSearchParams, { mode: 'edit', id: 'bad' });
      const { getByText } = render(<CompanyStationNewScreen />);
      fireEvent.press(getByText('Enviar solicitud de edicion'));
      await waitFor(() => {
        expect(getByText('ID de estacion invalido')).toBeTruthy();
      });
    });
  });

  describe('resolveCompanyNombre fallback', () => {
    test('handles fetchCompanyProfile error silently', async () => {
      (getPrivilegedUser as jest.Mock).mockResolvedValue(null);
      (fetchCompanyProfile as jest.Mock).mockRejectedValue(new Error('Network'));
      const { getByPlaceholderText } = render(<CompanyStationNewScreen />);
      await waitFor(() => {
        expect(getByPlaceholderText('Promotor/gestor').props.value).toBe('');
      });
    });
  });
});