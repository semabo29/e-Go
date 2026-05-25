import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn<any>();
const mockPush = jest.fn<any>();
const mockGetPrivilegedToken = jest.fn<any>();
const mockClearPrivilegedSession = jest.fn<any>();
const mockFetchCompanyProfile = jest.fn<any>();
const mockMergeStoredCompanyUser = jest.fn<any>();
const mockUpdateCompanyNombreOnServer = jest.fn<any>();
const mockListCompanyStations = jest.fn<any>();
const mockRequestDeleteCompanyStation = jest.fn<any>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('@/services/privilegedAuth', () => ({
  getPrivilegedToken: (...args: any[]) => mockGetPrivilegedToken(...args),
  clearPrivilegedSession: (...args: any[]) => mockClearPrivilegedSession(...args),
}));

jest.mock('@/services/companyProfile', () => ({
  fetchCompanyProfile: (...args: any[]) => mockFetchCompanyProfile(...args),
  mergeStoredCompanyUser: (...args: any[]) => mockMergeStoredCompanyUser(...args),
  updateCompanyNombreOnServer: (...args: any[]) => mockUpdateCompanyNombreOnServer(...args),
}));

jest.mock('@/services/stationModeration', () => ({
  listCompanyStations: (...args: any[]) => mockListCompanyStations(...args),
  requestDeleteCompanyStation: (...args: any[]) => mockRequestDeleteCompanyStation(...args),
}));

jest.mock('@/components/stations/ManualStationCard', () => ({
  ManualStationCard: ({ station, onEdit, onDelete }: { station: { nom: string; id: number }; onEdit?: () => void; onDelete?: () => void }) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return React.createElement(
      View,
      { testID: `station-card-${station.id}` },
      React.createElement(Text, null, station.nom),
      React.createElement(TouchableOpacity, { testID: `edit-station-${station.id}`, onPress: onEdit }, React.createElement(Text, null, 'Editar')),
      React.createElement(TouchableOpacity, { testID: `delete-station-${station.id}`, onPress: onDelete }, React.createElement(Text, null, 'Solicitar borrado'))
    );
  },
}));

import CompanyHomeScreen from '@/app/company-home';
import es from '@/tests/helpers/localeEs';

const L = es.companyHome;

const mockProfile: any = {
  id: 1,
  user_id: 10,
  email: 'empresa@test.com',
  username: 'testcompany',
  nombre: 'Mi Empresa',
  company_since: '2024-01-01',
};

const mockStation: any = {
  id: 1,
  nom: 'Estacion Empresa',
  latitud: 41.0,
  longitud: 2.0,
  kw: 22,
  ac_dc: 'AC',
  tipus_connexio: 'T2',
  tipus_velocitat: 'Normal',
  adreca: '',
  municipi: '',
  provincia: '',
  promotor: '',
  acces: '',
};

describe('CompanyHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    mockGetPrivilegedToken.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<CompanyHomeScreen />);
    expect(getByText(/Verificando/)).toBeTruthy();
  });

  test('shows error when no company token', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText } = render(<CompanyHomeScreen />);
    await findByText(L.noSession);
  });

  test('shows company profile after loading', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    expect(true).toBeTruthy();
  });

  test('shows company email in profile', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText } = render(<CompanyHomeScreen />);
    await findByText('empresa@test.com');
  });

  test('shows Sin nombre when nombre is null', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue({ ...mockProfile, nombre: null });
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText } = render(<CompanyHomeScreen />);
    await findByText(L.noName);
  });

  test('shows stations list', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    const { findByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
  });

  test('shows no stations message when empty', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText } = render(<CompanyHomeScreen />);
    await findByText(/No tienes estaciones/);
  });

  test('logout calls clearPrivilegedSession and navigates', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    mockClearPrivilegedSession.mockResolvedValue(undefined);
    const { findByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText(L.logout));
    await waitFor(() => {
      expect(mockClearPrivilegedSession).toHaveBeenCalledWith('company');
      expect(mockReplace).toHaveBeenCalledWith('/company-login');
    });
  });

  test('error button navigates to company-login', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText, getByText } = render(<CompanyHomeScreen />);
    await findByText(L.noSession);
    fireEvent.press(getByText(L.goLogin));
    expect(mockReplace).toHaveBeenCalledWith('/company-login');
  });

  test('shows edit nombre form when edit button pressed', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText, getByText, getByPlaceholderText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText(/Cambiar nombre/));
    expect(getByPlaceholderText('Nombre comercial')).toBeTruthy();
  });

  test('cancel edit nombre form hides input', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText, getByText, queryByPlaceholderText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText(/Cambiar nombre/));
    fireEvent.press(getByText('Cancelar'));
    await waitFor(() => {
      expect(queryByPlaceholderText('Nombre comercial')).toBeNull();
    });
  });

  test('save nombre calls updateCompanyNombreOnServer', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    mockUpdateCompanyNombreOnServer.mockResolvedValue({ ...mockProfile, nombre: 'Nuevo Nombre' });
    mockMergeStoredCompanyUser.mockResolvedValue(undefined);
    const { findByText, getByText, getByPlaceholderText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText(/Cambiar nombre/));
    const input = getByPlaceholderText('Nombre comercial');
    fireEvent.changeText(input, 'Nuevo Nombre');
    fireEvent.press(getByText('Guardar'));
    await waitFor(() => {
      expect(mockUpdateCompanyNombreOnServer).toHaveBeenCalledWith('Nuevo Nombre');
    });
  });

  test('profile load error shows error message', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockRejectedValue(new Error('Profile load failed'));
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText } = render(<CompanyHomeScreen />);
    await findByText(/perfil de empresa/);
  });

  test('navigates to company-station-new', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText(/Nueva solicitud/));
    expect(mockPush).toHaveBeenCalledWith('/company-station-new');
  });

  test('navigates to company-requests', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText(/Ver mis solicitudes/));
    expect(mockPush).toHaveBeenCalledWith('/company-requests');
  });

  test('delete station request opens confirm modal', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    const { findByText, getByTestId, getAllByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('delete-station-1'));
    await waitFor(() => {
      expect(getAllByText('Solicitar borrado').length).toBeGreaterThan(0);
    });
  });

  test('confirm delete sends request and refreshes', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations
      .mockResolvedValueOnce([mockStation])
      .mockResolvedValueOnce([]);
    mockRequestDeleteCompanyStation.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { findByText, getByTestId, getAllByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('delete-station-1'));
    await waitFor(() => expect(getAllByText('Solicitar borrado').length).toBeGreaterThan(0));
    fireEvent.press(getByText('Enviar'));
    await waitFor(() => {
      expect(mockRequestDeleteCompanyStation).toHaveBeenCalledWith(1);
    });
  });

  test('confirm delete shows API error', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    mockRequestDeleteCompanyStation.mockResolvedValue({ ok: false, json: async () => ({ error: 'Sin permiso' }) });
    const { findByText, getByTestId, getAllByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('delete-station-1'));
    await waitFor(() => expect(getAllByText('Solicitar borrado').length).toBeGreaterThan(0));
    fireEvent.press(getByText('Enviar'));
    await findByText('Sin permiso');
  });

  test('confirm delete shows fallback error', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    mockRequestDeleteCompanyStation.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { findByText, getByTestId, getAllByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('delete-station-1'));
    await waitFor(() => expect(getAllByText('Solicitar borrado').length).toBeGreaterThan(0));
    fireEvent.press(getByText('Enviar'));
    await findByText(/solicitud/);
  });

  test('confirm delete shows network error', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    mockRequestDeleteCompanyStation.mockRejectedValue(new Error('Network'));
    const { findByText, getByTestId, getAllByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('delete-station-1'));
    await waitFor(() => expect(getAllByText('Solicitar borrado').length).toBeGreaterThan(0));
    fireEvent.press(getByText('Enviar'));
    await findByText(/servidor/);
  });

  test('refreshStations shows generic error when stations fail', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Network error'));
    const { findByText, getByText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText('Actualizar'));
    await findByText('No se pudieron cargar las estaciones');
  });

  test('saveNombreEmpresa shows error on failure', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([]);
    mockUpdateCompanyNombreOnServer.mockRejectedValue(new Error('Nombre ya existe'));
    const { findByText, getByText, getByPlaceholderText } = render(<CompanyHomeScreen />);
    await findByText('Mi Empresa');
    fireEvent.press(getByText(/Cambiar nombre/));
    fireEvent.changeText(getByPlaceholderText('Nombre comercial'), 'Nombre Error');
    fireEvent.press(getByText('Guardar'));
    await findByText('Nombre ya existe');
  });

  test('edit station navigates to company-station-new with params', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    const { findByText, getByTestId } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('edit-station-1'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('company-station-new') })
    );
  });

  test('cancel button in delete confirm modal closes it', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    const { findByText, getByTestId, getByText, queryByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('delete-station-1'));
    await waitFor(() => expect(getByText('Enviar')).toBeTruthy());
    fireEvent.press(getByText('Cancelar'));
    await waitFor(() => {
      expect(queryByText('Enviar')).toBeNull();
    });
  });

  test('delete confirm modal shows body text', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockFetchCompanyProfile.mockResolvedValue(mockProfile);
    mockListCompanyStations.mockResolvedValue([mockStation]);
    const { findByText, getByTestId, getByText } = render(<CompanyHomeScreen />);
    await findByText('Estacion Empresa');
    fireEvent.press(getByTestId('delete-station-1'));
    await waitFor(() => {
      expect(getByText(L.deleteRequestBody)).toBeTruthy();
      expect(getByText('Enviar')).toBeTruthy();
    });
  });
});