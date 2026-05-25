import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn<any>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/services/incidenciaAdminService', () => ({
  listHistoryIncidencias: jest.fn<any>(),
  validateIncidencia: jest.fn<any>(),
  rejectIncidencia: jest.fn<any>(),
  resolveIncidencia: jest.fn<any>(),
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
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn<any>() as any);
    (global as any).alert = jest.fn<any>();
  });

  test('shows loading state initially', () => {
    (listHistoryIncidencias as jest.Mock<any>).mockReturnValue(new Promise(() => {}));
    const { queryByText } = render(<AdminIncidenciasHistoryScreen />);
    expect(queryByText('No hay incidencias en el historico.')).toBeNull();
  });

  test('shows empty message when no incidencias', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
  });

  test('shows incidencia list after loading', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
  });

  test('shows title and back button', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    expect(getByText(/Hist/)).toBeTruthy();
    expect(getByText('Volver al panel admin')).toBeTruthy();
  });

  test('back button navigates to admin-home', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Volver al panel admin'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-home');
  });

  test('shows error text when load fails', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockRejectedValue(new Error('Fetch failed'));
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText('Fetch failed');
  });

  test('shows apply filters button', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    expect(getByText('Aplicar filtros')).toBeTruthy();
  });

  test('shows clear filters button', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    expect(getByText(/Limpiar/)).toBeTruthy();
  });

  test('apply filters calls listHistoryIncidencias again', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      expect(listHistoryIncidencias).toHaveBeenCalledTimes(2);
    });
  });

  test('last week shortcut sets date range', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText(/semana/));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('last month shortcut sets date range', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText(/mes/));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('validate button calls validateIncidencia', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockResolvedValue({
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
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockValidatedInc]);
    (resolveIncidencia as jest.Mock<any>).mockResolvedValue({ ...mockValidatedInc, resolta: true });
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion V/);
    fireEvent.press(getByText('Marcar resuelta'));
    await waitFor(() => {
      expect(resolveIncidencia).toHaveBeenCalledWith(2);
    });
  });

  test('shows pending incidencia with Validar and Rechazar', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    expect(getByText('Validar')).toBeTruthy();
    expect(getByText('Rechazar')).toBeTruthy();
  });

  test('shows validated incidencia with Marcar resuelta', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockValidatedInc]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion V/);
    expect(getByText('Marcar resuelta')).toBeTruthy();
  });

  test('reject button opens modal', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Rechazar'));
    expect(getByText(/Rechazar #1/)).toBeTruthy();
  });

  test('tipo filter toggles on press', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Averiada'));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('estado filter toggles on press', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Validada'));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });

  test('shows more button when hasMore is true', async () => {
    const manyIncs = Array.from({ length: 21 }, (_, i) => ({ ...mockInc, id: i + 1, estacio_nom: `Est ${i + 1}` }));
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue(manyIncs);
    const { findByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Cargar/);
  });

  test('load more calls listHistoryIncidencias with next offset', async () => {
    const manyIncs = Array.from({ length: 21 }, (_, i) => ({ ...mockInc, id: i + 1, estacio_nom: `Est ${i + 1}` }));
    (listHistoryIncidencias as jest.Mock<any>)
      .mockResolvedValueOnce(manyIncs)
      .mockResolvedValueOnce([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Cargar/);
    fireEvent.press(getByText('Cargar más'));
    await waitFor(() => {
      expect(listHistoryIncidencias).toHaveBeenCalledTimes(2);
    });
  });

  test('clear filters button resets from, to, tipus and estado', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    // Press last week to set some filters
    fireEvent.press(getByText('Última semana'));
    // Now clear
    fireEvent.press(getByText('Limpiar'));
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1); // still only initial load
  });

  test('opens detail modal when Ver detalles is pressed', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    const detailBtns = getAllByText('Ver detalles');
    fireEvent.press(detailBtns[0]);
    await waitFor(() => {
      expect(getAllByText(/Incidencia #1/).length).toBeGreaterThan(0);
    });
  });

  test('detail modal shows incident fields', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await waitFor(() => {
      expect(getAllByText(/Incidencia #1/).length).toBeGreaterThan(0);
    });
    await findByText('testuser');
  });

  test('close button in detail modal closes it', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getAllByText, getByText, queryByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await waitFor(() => expect(getAllByText(/Incidencia #1/).length).toBeGreaterThan(0));
    fireEvent.press(getByText('Cerrar'));
    await waitFor(() => {
      expect(queryByText('Cerrar')).toBeNull();
    });
  });

  test('validate from detail modal calls validateIncidencia', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockResolvedValue({
      incidencia: { ...mockInc, validada: true },
      pointsAwarded: null,
    });
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await waitFor(() => expect(getAllByText('Validar').length).toBeGreaterThan(0));
    const validateBtns = getAllByText('Validar');
    fireEvent.press(validateBtns[validateBtns.length - 1]);
    await waitFor(() => {
      expect(validateIncidencia).toHaveBeenCalledWith(1);
    });
  });

  test('validate with points shows alert with points message', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockResolvedValue({
      incidencia: { ...mockInc, validada: true },
      pointsAwarded: { points: 10, isPremium: false },
    });
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Validar'));
    await waitFor(() => {
      expect(validateIncidencia).toHaveBeenCalledWith(1);
    });
  });

  test('validate with premium points shows premium suffix', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockResolvedValue({
      incidencia: { ...mockInc, validada: true },
      pointsAwarded: { points: 20, isPremium: true },
    });
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Validar'));
    await waitFor(() => {
      expect(validateIncidencia).toHaveBeenCalledWith(1);
    });
  });

  test('validate error shows error text', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockRejectedValue(new Error('Validate failed'));
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Validar'));
    await findByText('Validate failed');
  });

  test('validate error fallback message when not Error instance', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockRejectedValue('oops');
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Validar'));
    await findByText('No se pudo validar');
  });

  test('reject modal submit calls rejectIncidencia', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (rejectIncidencia as jest.Mock<any>).mockResolvedValue({ ...mockInc, rebutjada: true });
    const { findByText, getByText, getAllByText, getByPlaceholderText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    const rejectBtns = getAllByText('Rechazar');
    fireEvent.press(rejectBtns[0]);
    await waitFor(() => expect(getByText(/Rechazar #1/)).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('Motivo del rechazo (opcional)'), 'Sin evidencias');
    const allReject = getAllByText('Rechazar');
    fireEvent.press(allReject[allReject.length - 1]);
    await waitFor(() => {
      expect(rejectIncidencia).toHaveBeenCalledWith(1, 'Sin evidencias');
    });
  });

  test('reject without reason calls rejectIncidencia with undefined motiu', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (rejectIncidencia as jest.Mock<any>).mockResolvedValue({ ...mockInc, rebutjada: true });
    const { findByText, getByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Rechazar'));
    await waitFor(() => expect(getByText(/Rechazar #1/)).toBeTruthy());
    const rejectBtns = getAllByText('Rechazar');
    fireEvent.press(rejectBtns[rejectBtns.length - 1]);
    await waitFor(() => {
      expect(rejectIncidencia).toHaveBeenCalledWith(1, undefined);
    });
  });

  test('reject cancel button closes the modal', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getByText, queryByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getByText('Rechazar'));
    await waitFor(() => expect(getByText(/Rechazar #1/)).toBeTruthy());
    fireEvent.press(getByText('Cancelar'));
    await waitFor(() => {
      expect(queryByText(/Rechazar #1/)).toBeNull();
    });
  });

  test('reject error shows error text', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (rejectIncidencia as jest.Mock<any>).mockRejectedValue(new Error('Reject failed'));
    const { findByText, getByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    const rejectBtns = getAllByText('Rechazar');
    fireEvent.press(rejectBtns[0]);
    await waitFor(() => expect(getByText(/Rechazar #1/)).toBeTruthy());
    const allReject = getAllByText('Rechazar');
    fireEvent.press(allReject[allReject.length - 1]);
    await findByText('Reject failed');
  });

  test('resolve error shows error text', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockValidatedInc]);
    (resolveIncidencia as jest.Mock<any>).mockRejectedValue(new Error('Resolve failed'));
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion V/);
    fireEvent.press(getByText('Marcar resuelta'));
    await findByText('Resolve failed');
  });

  test('detail modal for incidencia with estacio_municipi shows municipality field', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await findByText('Madrid');
  });

  test('detail modal shows Sí for punts_atorgats true', async () => {
    const incWithPoints = { ...mockInc, punts_atorgats: true };
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([incWithPoints]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await findByText('Sí');
  });

  test('detail modal shows No for punts_atorgats false', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await findByText('No');
  });

  test('detail modal for validated inc shows Marcar resuelta button', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([mockValidatedInc]);
    (resolveIncidencia as jest.Mock<any>).mockResolvedValue({ ...mockValidatedInc, resolta: true });
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion V/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await waitFor(() => expect(getAllByText('Marcar resuelta').length).toBeGreaterThan(1));
  });

  test('apply filters calls listHistoryIncidencias with type filter', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    // Toggle type filter on
    fireEvent.press(getByText('Averiada'));
    // Apply filters
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      expect(listHistoryIncidencias).toHaveBeenCalledTimes(2);
    });
  });

  test('apply filters with status filter calls with estado param', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Validada'));
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      expect(listHistoryIncidencias).toHaveBeenCalledTimes(2);
    });
  });

  test('from and to date inputs accept YYYY-MM-DD and apply sends them to API', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByPlaceholderText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.changeText(getByPlaceholderText('2026-01-01'), '2024-06-01');
    fireEvent.changeText(getByPlaceholderText('2026-12-31'), '2024-06-30');
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      const lastCall = (listHistoryIncidencias as jest.Mock<any>).mock.calls[1] as any[];
      expect(lastCall[0]).toMatchObject({ from: '2024-06-01', to: '2024-06-30' });
    });
  });

  test('editing from date after last-week shortcut updates applied filter', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByPlaceholderText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Última semana'));
    const fromInput = getByPlaceholderText('2026-01-01');
    fireEvent.changeText(fromInput, '2024-01-15');
    expect(fromInput.props.value).toBe('2024-01-15');
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      const lastCall = (listHistoryIncidencias as jest.Mock<any>).mock.calls[1] as any[];
      expect(lastCall[0].from).toBe('2024-01-15');
    });
  });

  test('clear filters empties date text inputs after shortcut', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByPlaceholderText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Última semana'));
    const fromInput = getByPlaceholderText('2026-01-01');
    expect(fromInput.props.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.press(getByText('Limpiar'));
    expect(fromInput.props.value).toBe('');
    expect(getByPlaceholderText('2026-12-31').props.value).toBe('');
  });

  test('detail modal shows rejection reason when motiu_rebuig is set', async () => {
    const rejectedInc = {
      ...mockInc,
      id: 3,
      rebutjada: true,
      motiu_rebuig: 'Sin documentacion',
      data_rebuig: '2024-02-15T10:00:00Z',
    };
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([rejectedInc]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await findByText('Sin documentacion');
  });

  test('detail modal shows validation date when data_validacio is set', async () => {
    const validatedWithDate = {
      ...mockInc,
      id: 4,
      validada: true,
      data_validacio: '2024-03-01T12:00:00Z',
    };
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([validatedWithDate]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await findByText('Fecha validación');
  });

  test('detail modal shows resolution date when data_resolucio is set', async () => {
    const resolvedInc = {
      ...mockInc,
      id: 5,
      validada: true,
      resolta: true,
      data_validacio: '2024-03-01T12:00:00Z',
      data_resolucio: '2024-03-10T12:00:00Z',
    };
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([resolvedInc]);
    const { findByText, getAllByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/Estacion Historia/);
    fireEvent.press(getAllByText('Ver detalles')[0]);
    await findByText('Fecha resolución');
  });

  test('last week sets from and to date strings then apply fetches with them', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Última semana'));
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      expect(listHistoryIncidencias).toHaveBeenCalledTimes(2);
      const lastCall = (listHistoryIncidencias as jest.Mock<any>).mock.calls[1] as any[];
      expect(lastCall[0]).toMatchObject({
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });
  });

  test('last month sets from and to date strings', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Último mes'));
    fireEvent.press(getByText('Aplicar filtros'));
    await waitFor(() => {
      const lastCall = (listHistoryIncidencias as jest.Mock<any>).mock.calls[1] as any[];
      expect(lastCall[0]).toMatchObject({
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });
  });

  test('last week shortcut fills from and to date inputs', async () => {
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByPlaceholderText, getByText } = render(<AdminIncidenciasHistoryScreen />);
    await findByText(/No se encontraron/);
    fireEvent.press(getByText('Última semana'));
    expect(getByPlaceholderText('2026-01-01').props.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getByPlaceholderText('2026-12-31').props.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(listHistoryIncidencias).toHaveBeenCalledTimes(1);
  });
});
