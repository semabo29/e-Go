import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn<any>();
const mockPush = jest.fn<any>();
const mockSetUser = jest.fn<any>();
const mockGetPrivilegedToken = jest.fn<any>();
const mockPrivilegedFetch = jest.fn<any>();
const mockClearPrivilegedSession = jest.fn<any>();
const mockListAdminStations = jest.fn<any>();
const mockDeleteAdminStation = jest.fn<any>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ setUser: mockSetUser, user: null, logout: jest.fn<any>(), isLoading: false }),
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => ({ colorblindFriendly: false }),
}));

jest.mock('@/services/privilegedAuth', () => ({
  getPrivilegedToken: (...args: any[]) => mockGetPrivilegedToken(...args),
  privilegedFetch: (...args: any[]) => mockPrivilegedFetch(...args),
  clearPrivilegedSession: (...args: any[]) => mockClearPrivilegedSession(...args),
}));

jest.mock('@/services/stationModeration', () => ({
  listAdminStations: (...args: any[]) => mockListAdminStations(...args),
  deleteAdminStation: (...args: any[]) => mockDeleteAdminStation(...args),
}));

jest.mock('@/components/stations/ManualStationCard', () => ({
  ManualStationCard: ({ station, onEdit, onDelete }: { station: { nom: string; id: number }; onEdit?: () => void; onDelete?: () => void }) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return React.createElement(
      View,
      { testID: `station-card-${station.id}` },
      React.createElement(Text, null, station.nom),
      React.createElement(TouchableOpacity, { testID: `edit-${station.id}`, onPress: onEdit }, React.createElement(Text, null, 'Editar')),
      React.createElement(TouchableOpacity, { testID: `delete-${station.id}`, onPress: onDelete }, React.createElement(Text, null, 'Borrar'))
    );
  },
}));

import AdminHomeScreen from '@/app/admin-home';
import es from '@/tests/helpers/localeEs';

const L = es.adminHome;

const mockAdminData = { admin: { sub: 1, email: 'admin@test.com', role: 'admin' } };
const mockStation = { id: 1, nom: 'Estacion Test', latitud: 41.0, longitud: 2.0, kw: 22, ac_dc: 'AC', tipus_connexio: 'T2', tipus_velocitat: 'Normal', adreca: '', municipi: '', provincia: '', promotor: '', acces: '' };

describe('AdminHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading indicator initially', () => {
    mockGetPrivilegedToken.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<AdminHomeScreen />);
    expect(getByText(/Verificando/)).toBeTruthy();
  });

  test('shows error when no admin token', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText } = render(<AdminHomeScreen />);
    await findByText(L.noSession);
  });

  test('shows error when privilegedFetch fails', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No autorizado' }),
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText } = render(<AdminHomeScreen />);
    await findByText('No autorizado');
  });

  test('shows admin email after successful load', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
  });

  test('shows navigation buttons after login', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    expect(getByText(L.userModeration)).toBeTruthy();
    expect(getByText(L.pendingIncidents)).toBeTruthy();
    expect(getByText(L.incidentHistory)).toBeTruthy();
    expect(getByText(L.reviewRequests)).toBeTruthy();
  });

  test('navigates to admin-users screen', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.userModeration));
    expect(mockPush).toHaveBeenCalledWith('/admin-users');
  });

  test('navigates to admin-incidencias screen', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.pendingIncidents));
    expect(mockPush).toHaveBeenCalledWith('/admin-incidencias');
  });

  test('navigates to admin-requests screen', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.reviewRequests));
    expect(mockPush).toHaveBeenCalledWith('/admin-requests');
  });

  test('shows stations list', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([mockStation]);
    const { findByText } = render(<AdminHomeScreen />);
    await findByText('Estacion Test');
  });

  test('logout calls clearPrivilegedSession and navigates', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    mockClearPrivilegedSession.mockResolvedValue(undefined);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.logout));
    await waitFor(() => {
      expect(mockClearPrivilegedSession).toHaveBeenCalledWith('admin');
      expect(mockReplace).toHaveBeenCalledWith('/admin-login');
    });
  });

  test('error button navigates back to admin-login', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText(L.noSession);
    fireEvent.press(getByText(L.backLogin));
    expect(mockReplace).toHaveBeenCalledWith('/admin-login');
  });

  test('shows no-stations message when empty', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText } = render(<AdminHomeScreen />);
    await findByText(/No has creado/);
  });

  test('handles network error gracefully', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockRejectedValue(new Error('Network error'));
    mockListAdminStations.mockResolvedValue([]);
    const { findByText } = render(<AdminHomeScreen />);
    await findByText(/servidor/);
  });

  test('navigates to admin-station-new when pressing Anadir', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.addStation));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('admin-station-new'));
  });

  test('loadMyStations shows error when listAdminStations throws', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockRejectedValue(new Error('Network error'));
    const { findByText } = render(<AdminHomeScreen />);
    await findByText(/servidor/);
  });

  test('Ir a la aplicacion fetches user and navigates to tabs', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockAdminData })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: 1, email: 'admin@test.com' } }) });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.goToApp));
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({ id: 1, email: 'admin@test.com' });
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  test('Ir a la aplicacion shows error when user fetch fails', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockAdminData })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Sin permisos' }) });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.goToApp));
    await findByText('Sin permisos');
  });

  test('Ir a la aplicacion shows error on network failure', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockAdminData })
      .mockRejectedValueOnce(new Error('timeout'));
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.goToApp));
    await findByText(/servidor/);
  });

  test('opens delete confirmation modal and cancels', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockResolvedValue([mockStation]);
    const { findByText, getByTestId, getByText } = render(<AdminHomeScreen />);
    await findByText('Estacion Test');
    fireEvent.press(getByTestId('delete-1'));
    expect(getByText(L.deleteStationTitle)).toBeTruthy();
    fireEvent.press(getByText(es.common.cancel));
  });

  test('deletes station successfully via confirm modal', async () => {
    mockGetPrivilegedToken
      .mockResolvedValueOnce('token123')
      .mockResolvedValueOnce('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockResolvedValue([mockStation]);
    mockDeleteAdminStation.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { findByText, getByTestId, getAllByText } = render(<AdminHomeScreen />);
    await findByText('Estacion Test');
    fireEvent.press(getByTestId('delete-1'));
    const borrarBtns = getAllByText(L.delete);
    fireEvent.press(borrarBtns[borrarBtns.length - 1]);
    await waitFor(() => {
      expect(mockDeleteAdminStation).toHaveBeenCalledWith(1);
    });
  });

  test('delete station shows error on API failure', async () => {
    mockGetPrivilegedToken
      .mockResolvedValueOnce('token123')
      .mockResolvedValueOnce('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockResolvedValue([mockStation]);
    mockDeleteAdminStation.mockResolvedValue({ ok: false, json: async () => ({ error: 'No se pudo borrar' }) });
    const { findByText, getByTestId, getAllByText } = render(<AdminHomeScreen />);
    await findByText('Estacion Test');
    fireEvent.press(getByTestId('delete-1'));
    const borrarBtns = getAllByText(L.delete);
    fireEvent.press(borrarBtns[borrarBtns.length - 1]);
    await findByText('No se pudo borrar');
  });

  test('delete station shows error when no session', async () => {
    mockGetPrivilegedToken
      .mockResolvedValueOnce('token123')
      .mockResolvedValueOnce(null);
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockResolvedValue([mockStation]);
    const { findByText, getByTestId, getAllByText } = render(<AdminHomeScreen />);
    await findByText('Estacion Test');
    fireEvent.press(getByTestId('delete-1'));
    const borrarBtns = getAllByText(L.delete);
    fireEvent.press(borrarBtns[borrarBtns.length - 1]);
    await findByText(L.noSession);
  });

  test('delete station shows error on network failure', async () => {
    mockGetPrivilegedToken
      .mockResolvedValueOnce('token123')
      .mockResolvedValueOnce('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockResolvedValue([mockStation]);
    mockDeleteAdminStation.mockRejectedValue(new Error('Network error'));
    const { findByText, getByTestId, getAllByText } = render(<AdminHomeScreen />);
    await findByText('Estacion Test');
    fireEvent.press(getByTestId('delete-1'));
    const borrarBtns = getAllByText(L.delete);
    fireEvent.press(borrarBtns[borrarBtns.length - 1]);
    await findByText(/servidor/);
  });

  test('edit station navigates to admin-station-new with params', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: true, json: async () => mockAdminData });
    mockListAdminStations.mockResolvedValue([mockStation]);
    const { findByText, getByTestId } = render(<AdminHomeScreen />);
    await findByText('Estacion Test');
    fireEvent.press(getByTestId('edit-1'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('admin-station-new') })
    );
  });

  test('navigates to admin-incidencias-history screen', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.incidentHistory));
    expect(mockPush).toHaveBeenCalledWith('/admin-incidencias-history');
  });

  test('navigates to admin-stations screen', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAdminData,
    });
    mockListAdminStations.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminHomeScreen />);
    await findByText('admin@test.com');
    fireEvent.press(getByText(L.manageStations));
    expect(mockPush).toHaveBeenCalledWith('/admin-stations');
  });
});