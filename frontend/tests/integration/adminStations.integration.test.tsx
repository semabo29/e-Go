import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockReplace = jest.fn<any>();
const mockGetPrivilegedToken = jest.fn<any>();
const mockPrivilegedFetch = jest.fn<any>();
const mockListAllAdminStations = jest.fn<any>();
const mockSetStationOperatiu = jest.fn<any>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/services/privilegedAuth', () => ({
  getPrivilegedToken: (...args: any[]) => mockGetPrivilegedToken(...args),
  privilegedFetch: (...args: any[]) => mockPrivilegedFetch(...args),
}));

jest.mock('@/services/stationModeration', () => ({
  listAllAdminStations: (...args: any[]) => mockListAllAdminStations(...args),
  setStationOperatiu: (...args: any[]) => mockSetStationOperatiu(...args),
}));

import AdminStationsScreen from '@/app/admin-stations';

const mockStation = {
  id: 1,
  nom: 'Estacion Alpha',
  municipi: 'Barcelona',
  provincia: 'Barcelona',
  adreca: 'Calle Test 1',
  kw: 22,
  ac_dc: 'AC',
  tipus_connexio: 'Type2',
  is_manual: true,
  operatiu: true,
};

const mockNonOperativeStation = {
  ...mockStation,
  id: 2,
  nom: 'Estacion Beta',
  operatiu: false,
};

const mockStationNoLocation = {
  ...mockStation,
  id: 3,
  nom: 'Estacion Gamma',
  municipi: null,
  provincia: null,
  kw: null,
  ac_dc: null,
};

const mockAdminMeOk = { ok: true, json: async () => ({ admin: { sub: 1, email: 'admin@test.com', role: 'admin' } }) };

describe('AdminStationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Auth states ──────────────────────────────────────────────────────────────

  test('shows loading state while verifying auth', () => {
    mockGetPrivilegedToken.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<AdminStationsScreen />);
    expect(getByText('Gestión de estaciones')).toBeTruthy();
    expect(getByText('Cargando…')).toBeTruthy();
  });

  test('shows no-session error when token is null', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('No hay sesión admin');
  });

  test('shows go-to-login button on auth error and navigates', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText, getByText } = render(<AdminStationsScreen />);
    await findByText('No hay sesión admin');
    fireEvent.press(getByText('Ir al login'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-login');
  });

  test('shows unauthorized error when /admin/me returns error', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'No autorizado' }) });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('No autorizado');
  });

  test('shows fallback unauthorized error when no error message', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('No autorizado');
  });

  test('shows connection error when privilegedFetch throws', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockRejectedValue(new Error('timeout'));
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('No se pudo conectar con el servidor');
  });

  // ── Station list ─────────────────────────────────────────────────────────────

  test('shows station list after successful auth', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
  });

  test('shows station municipality and province', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
    await findByText('Barcelona, Barcelona');
  });

  test('shows station kW and AC/DC metadata', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
    await findByText(/22 kW/);
  });

  test('shows operative status badge', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Operativa');
  });

  test('shows non-operative status badge', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockNonOperativeStation], hasMore: false });
    const { findByText, getAllByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Beta');
    const noOpTexts = getAllByText('No operativa');
    expect(noOpTexts.length).toBeGreaterThan(0);
  });

  test('shows reactivate button for non-operative station', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockNonOperativeStation], hasMore: false });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Reactivar');
  });

  test('shows station without location or kW (null fields)', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStationNoLocation], hasMore: false });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Gamma');
  });

  test('shows empty message when no stations found', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [], hasMore: false });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('No hay estaciones.');
  });

  test('shows load error when listAllAdminStations throws', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockRejectedValue(new Error('Network error'));
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Network error');
  });

  test('shows load error with fallback when error is not an Error instance', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockRejectedValue('string error');
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Error cargando estaciones');
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  test('back button navigates to admin-home', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [], hasMore: false });
    const { findByText, getByText } = render(<AdminStationsScreen />);
    await findByText('No hay estaciones.');
    fireEvent.press(getByText('Volver al panel admin'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-home');
  });

  // ── Refresh ──────────────────────────────────────────────────────────────────

  test('refresh button calls listAllAdminStations again', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [], hasMore: false });
    const { findByText, getByText } = render(<AdminStationsScreen />);
    await findByText('No hay estaciones.');
    fireEvent.press(getByText('Actualizar'));
    await waitFor(() => {
      expect(mockListAllAdminStations).toHaveBeenCalledTimes(2);
    });
  });

  // ── Search ───────────────────────────────────────────────────────────────────

  test('search input triggers debounced search', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [], hasMore: false });
    const { findByPlaceholderText } = render(<AdminStationsScreen />);
    const input = await findByPlaceholderText('Nombre, municipio o provincia…');
    fireEvent.changeText(input, 'Alpha');
    expect(mockListAllAdminStations).toHaveBeenCalledTimes(1); // no extra call yet
    act(() => { jest.advanceTimersByTime(450); });
    await waitFor(() => {
      expect(mockListAllAdminStations).toHaveBeenCalledTimes(2);
      expect(mockListAllAdminStations).toHaveBeenLastCalledWith('Alpha', 0);
    });
  });

  test('shows no search results message when search returns empty', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [], hasMore: false });
    const { findByPlaceholderText, findByText } = render(<AdminStationsScreen />);
    const input = await findByPlaceholderText('Nombre, municipio o provincia…');
    fireEvent.changeText(input, 'NoMatch');
    act(() => { jest.advanceTimersByTime(450); });
    await findByText('Sin resultados para esa búsqueda.');
  });

  // ── Load more ────────────────────────────────────────────────────────────────

  test('shows load more button when hasMore is true', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: true });
    const { findByText } = render(<AdminStationsScreen />);
    await findByText('Cargar más');
  });

  test('load more button calls listAllAdminStations with next offset', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations
      .mockResolvedValueOnce({ stations: [mockStation], hasMore: true })
      .mockResolvedValueOnce({ stations: [], hasMore: false });
    const { findByText, getByText } = render(<AdminStationsScreen />);
    await findByText('Cargar más');
    fireEvent.press(getByText('Cargar más'));
    await waitFor(() => {
      expect(mockListAllAdminStations).toHaveBeenCalledTimes(2);
      expect(mockListAllAdminStations).toHaveBeenLastCalledWith('', 50);
    });
  });

  // ── Toggle operatiu modal ────────────────────────────────────────────────────

  test('pressing action button opens confirm modal for operative station', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    const { findByText, getAllByText, getByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
    // The action button text is the same as the status label for the other state
    const noOpBtns = getAllByText('No operativa');
    fireEvent.press(noOpBtns[0]);
    await waitFor(() => {
      expect(getByText('Marcar como no operativa')).toBeTruthy();
    });
  });

  test('cancel button in confirm modal closes the modal', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    const { findByText, getAllByText, getByText, queryByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
    const noOpBtns = getAllByText('No operativa');
    fireEvent.press(noOpBtns[0]);
    await waitFor(() => expect(getByText('Marcar como no operativa')).toBeTruthy());
    fireEvent.press(getByText('Cancelar'));
    await waitFor(() => {
      expect(queryByText('Marcar como no operativa')).toBeNull();
    });
  });

  test('confirm disable calls setStationOperatiu with false', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    mockSetStationOperatiu.mockResolvedValue({ ...mockStation, operatiu: false });
    const { findByText, getAllByText, getByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
    const noOpBtns = getAllByText('No operativa');
    fireEvent.press(noOpBtns[0]);
    await waitFor(() => expect(getByText('Marcar como no operativa')).toBeTruthy());
    // The confirm action button also says 'No operativa' - get the last one in the modal
    const allNoOp = getAllByText('No operativa');
    fireEvent.press(allNoOp[allNoOp.length - 1]);
    await waitFor(() => {
      expect(mockSetStationOperatiu).toHaveBeenCalledWith(1, false);
    });
  });

  test('confirm enable calls setStationOperatiu with true for non-operative station', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockNonOperativeStation], hasMore: false });
    mockSetStationOperatiu.mockResolvedValue({ ...mockNonOperativeStation, operatiu: true });
    const { findByText, getAllByText, getByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Beta');
    fireEvent.press(getByText('Reactivar'));
    await waitFor(() => expect(getByText('Reactivar estación')).toBeTruthy());
    const allReactivar = getAllByText('Reactivar');
    fireEvent.press(allReactivar[allReactivar.length - 1]);
    await waitFor(() => {
      expect(mockSetStationOperatiu).toHaveBeenCalledWith(2, true);
    });
  });

  test('setStationOperatiu error shows error message', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    mockSetStationOperatiu.mockRejectedValue(new Error('Update failed'));
    const { findByText, getAllByText, getByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
    const noOpBtns = getAllByText('No operativa');
    fireEvent.press(noOpBtns[0]);
    await waitFor(() => expect(getByText('Marcar como no operativa')).toBeTruthy());
    const allNoOp = getAllByText('No operativa');
    fireEvent.press(allNoOp[allNoOp.length - 1]);
    await findByText('Update failed');
  });

  test('setStationOperatiu fallback error when not Error instance', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMeOk);
    mockListAllAdminStations.mockResolvedValue({ stations: [mockStation], hasMore: false });
    mockSetStationOperatiu.mockRejectedValue('bad');
    const { findByText, getAllByText, getByText } = render(<AdminStationsScreen />);
    await findByText('Estacion Alpha');
    const noOpBtns = getAllByText('No operativa');
    fireEvent.press(noOpBtns[0]);
    await waitFor(() => expect(getByText('Marcar como no operativa')).toBeTruthy());
    const allNoOp = getAllByText('No operativa');
    fireEvent.press(allNoOp[allNoOp.length - 1]);
    await findByText('Error actualizando la estación');
  });
});
