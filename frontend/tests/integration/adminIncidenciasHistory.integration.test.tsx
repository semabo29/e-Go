import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/services/incidenciaAdminService', () => ({
  listHistoryIncidencias: jest.fn(),
  validateIncidencia: jest.fn(),
  rejectIncidencia: jest.fn(),
  resolveIncidencia: jest.fn(),
}));

import AdminIncidenciasHistoryScreen from '@/app/admin-incidencias-history';
import {
  listHistoryIncidencias,
  validateIncidencia,
  rejectIncidencia,
  resolveIncidencia,
} from '@/services/incidenciaAdminService';

const mockInc = {
  id: 1,
  tipus: 'Operatiu',
  data_inici: '2024-01-01T10:00:00Z',
  comentari: 'Test incidencia',
  arxiu: null,
  validada: false,
  resolta: false,
  rebutjada: false,
  motiu_rebuig: null,
  data_validacio: null,
  data_resolucio: null,
  data_rebuig: null,
  punts_atorgats: false,
  conductor: 1,
  estacio: 1,
  conductor_username: 'testuser',
  conductor_email: 'test@test.com',
  estacio_nom: 'Estacion Historia',
  estacio_municipi: 'Madrid',
  estacio_provincia: null,
};

const mockValidatedInc = { ...mockInc, id: 2, validada: true, estacio_nom: 'Estacion V' };

describe('AdminIncidenciasHistoryScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn() as any);
    (global as any).alert = jest.fn();
  });

  test('shows loading state initially', () => {
    (listHistoryIncidencias as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { queryByText } = render(<AdminIncidenciasHistoryScreen />);
    expect(queryByText('No hay incidencias en el historico.')).toBeNull();
  });

  test('shows empty message when no incidencias', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
  });

  test('shows incidencia list after loading', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([mockInc]);
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
  });

  test('shows title and back button', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    expect(getByText(/Hist/)).toBeTruthy();
    expect(getByText('Volver al panel admin')).toBeTruthy();
  });

  test('back button navigates to admin-home', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Volver al panel admin'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-home');
  });

  test('shows error text when load fails', async () => {
    (listHistoryIncidencias as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText('Fetch failed');
  });

  test('shows apply filters button', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    expect(getByText('Aplicar filtros')).toBeTruthy();
  });

  test('shows clear filters button', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    expect(getByText(/Limpiar/)).toBeTruthy();
  });

  test('apply filters calls listHistoryIncidencias again', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      expect(listHistoryIncidencias).toHaveBeenCalledTimes(2);
    });
  });

  test('last week shortcut sets date range', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText(/semana/));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('last month shortcut sets date range', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText(/mes/));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('validate button calls validateIncidencia', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock).mockResolvedValue({
      incidencia: { ...mockInc, validada: true },
      pointsAwarded: null,
    });
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Validar'));
    await waitFor(() => {
      expect(validateIncidencia).toHaveBeenCalledWith(1);
    });
  });

  test('resolve button calls resolveIncidencia', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([mockValidatedInc]);
    (resolveIncidencia as jest.Mock).mockResolvedValue({ ...mockValidatedInc, resolta: true });
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion V/);
    fireEvent.press(getByText('Marcar resuelta'));
    await waitFor(() => {
      expect(resolveIncidencia).toHaveBeenCalledWith(2);
    });
  });

  test('shows pending incidencia with Validar and Rechazar', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([mockInc]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    expect(getByText('Validar')).toBeTruthy();
    expect(getByText('Rechazar')).toBeTruthy();
  });

  test('shows validated incidencia with Marcar resuelta', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([mockValidatedInc]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion V/);
    expect(getByText('Marcar resuelta')).toBeTruthy();
  });

  test('reject button opens modal', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([mockInc]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Rechazar'));
    expect(getByText(/Rechazar #1/)).toBeTruthy();
  });

  test('tipo filter toggles on press', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Averiada'));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('estado filter toggles on press', async () => {
    (listHistoryIncidencias as jest.Mock).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Validada'));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('shows more button when hasMore is true', async () => {
    const manyIncs = Array.from({ length: 21 }, (_, i) => ({ ...mockInc, id: i + 1, estacio_nom: `Est ${i + 1}` }));
    (listHistoryIncidencias as jest.Mock).mockResolvedValue(manyIncs);
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Cargar/);
  });
});
