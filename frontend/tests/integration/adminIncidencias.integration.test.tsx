import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn<any>();
const mockPush = jest.fn<any>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('@/services/incidenciaAdminService', () => ({
  listPendingIncidencias: jest.fn<any>(),
  listHistoryIncidencias: jest.fn<any>(),
  validateIncidencia: jest.fn<any>(),
  rejectIncidencia: jest.fn<any>(),
  resolveIncidencia: jest.fn<any>(),
}));

import AdminIncidenciasScreen from '@/app/admin-incidencias';
import {
  listPendingIncidencias,
  listHistoryIncidencias,
  validateIncidencia,
  rejectIncidencia,
  resolveIncidencia,
} from '@/services/incidenciaAdminService';

const mockInc = {
  id: 1,
  tipus: 'Operatiu',
  data_inici: '2024-01-01T10:00:00Z',
  comentari: 'Test comentario sin acento',
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
  estacio_nom: 'Estacion A',
  estacio_municipi: 'Barcelona',
  estacio_provincia: null,
};

const mockIncValidated = { ...mockInc, id: 2, validada: true };
const mockIncRejected = { ...mockInc, id: 3, rebutjada: true };
const mockIncResolved = { ...mockInc, id: 4, validada: true, resolta: true };

describe('AdminIncidenciasScreen', () => {
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn<any>() as any);
    (listHistoryIncidencias as jest.Mock<any>).mockResolvedValue([]);
  });

  test('shows loading state initially', () => {
    (listPendingIncidencias as jest.Mock<any>).mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<AdminIncidenciasScreen />);
    expect(getByText(/Cargando/)).toBeTruthy();
  });

  test('shows incidencia card after loading', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { getByText, findByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    expect(getByText(/testuser/)).toBeTruthy();
    expect(getByText('Operativa')).toBeTruthy();
    expect(getByText('Pendiente')).toBeTruthy();
    expect(getByText('Test comentario sin acento')).toBeTruthy();
  });

  test('shows empty message when no incidencias', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText } = render(<AdminIncidenciasScreen />);
    await findByText('No hay incidencias pendientes.');
  });

  test('shows error text when load fails', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockRejectedValue(new Error('Load failed'));
    const { findByText } = render(<AdminIncidenciasScreen />);
    await findByText('Load failed');
  });

  test('shows error string when load throws non-Error', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockRejectedValue('network error');
    const { findByText } = render(<AdminIncidenciasScreen />);
    await findByText('Error cargando incidencias');
  });

  test('back button navigates to admin-home', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText('No hay incidencias pendientes.');
    fireEvent.press(getByText('Volver al panel admin'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-home');
  });

  test('refresh button reloads incidencias', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText('No hay incidencias pendientes.');
    fireEvent.press(getByText('Actualizar'));
    expect(listPendingIncidencias).toHaveBeenCalledTimes(2);
  });

  test('Validar button calls validateIncidencia and shows alert', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockResolvedValue({ pointsAwarded: null });
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Validar'));
    await waitFor(() => {
      expect(validateIncidencia).toHaveBeenCalledWith(1);
      expect(alertSpy).toHaveBeenCalledWith('Validada', 'Incidencia validada.');
    });
  });

  test('Validar shows premium points in alert', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockResolvedValue({
      pointsAwarded: { points: 10, isPremium: true },
    });
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Validar'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Validada',
        expect.stringContaining('10 puntos')
      );
    });
  });

  test('Validar shows non-premium points in alert', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockResolvedValue({
      pointsAwarded: { points: 5, isPremium: false },
    });
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Validar'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Validada',
        expect.stringContaining('5 puntos')
      );
    });
  });

  test('Validar shows error alert on failure', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (validateIncidencia as jest.Mock<any>).mockRejectedValue(new Error('Validate error'));
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Validar'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Validate error');
    });
  });

  test('Rechazar button opens modal', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getByText, getByPlaceholderText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Rechazar'));
    expect(getByPlaceholderText('Motivo del rechazo (opcional)')).toBeTruthy();
  });

  test('reject modal can be cancelled', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getByText, queryByPlaceholderText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Rechazar'));
    fireEvent.press(getByText('Cancelar'));
    await waitFor(() => {
      expect(queryByPlaceholderText('Motivo del rechazo (opcional)')).toBeNull();
    });
  });

  test('reject modal submits rejectIncidencia', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (rejectIncidencia as jest.Mock<any>).mockResolvedValue(undefined);
    const { findByText, getByText, getByPlaceholderText, getAllByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Rechazar'));
    const reasonInput = getByPlaceholderText('Motivo del rechazo (opcional)');
    fireEvent.changeText(reasonInput, 'Motivo de prueba');
    const rejectBtns = getAllByText('Rechazar');
    fireEvent.press(rejectBtns[rejectBtns.length - 1]);
    await waitFor(() => {
      expect(rejectIncidencia).toHaveBeenCalledWith(1, 'Motivo de prueba');
      expect(alertSpy).toHaveBeenCalledWith('Rechazada', expect.any(String));
    });
  });

  test('reject without reason passes undefined', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (rejectIncidencia as jest.Mock<any>).mockResolvedValue(undefined);
    const { findByText, getByText, getAllByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Rechazar'));
    const rejectBtns = getAllByText('Rechazar');
    fireEvent.press(rejectBtns[rejectBtns.length - 1]);
    await waitFor(() => {
      expect(rejectIncidencia).toHaveBeenCalledWith(1, undefined);
    });
  });

  test('reject shows error alert on failure', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    (rejectIncidencia as jest.Mock<any>).mockRejectedValue(new Error('Reject error'));
    const { findByText, getByText, getAllByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Rechazar'));
    const rejectBtns = getAllByText('Rechazar');
    fireEvent.press(rejectBtns[rejectBtns.length - 1]);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Reject error');
    });
  });

  test('Marcar resuelta calls resolveIncidencia', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockIncValidated]);
    (resolveIncidencia as jest.Mock<any>).mockResolvedValue(undefined);
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText('Validada');
    fireEvent.press(getByText('Marcar resuelta'));
    await waitFor(() => {
      expect(resolveIncidencia).toHaveBeenCalledWith(2);
      expect(alertSpy).toHaveBeenCalledWith('Resuelta', expect.any(String));
    });
  });

  test('resolve shows error alert on failure', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockIncValidated]);
    (resolveIncidencia as jest.Mock<any>).mockRejectedValue(new Error('Resolve error'));
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText('Validada');
    fireEvent.press(getByText('Marcar resuelta'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Resolve error');
    });
  });

  test('rejected incidencia shows Rechazada badge', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockIncRejected]);
    const { findByText } = render(<AdminIncidenciasScreen />);
    await findByText('Rechazada');
  });

  test('resolved incidencia shows Resuelta badge', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockIncResolved]);
    const { findByText } = render(<AdminIncidenciasScreen />);
    await findByText('Resuelta');
  });

  test('details modal shows incidencia info', async () => {
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([mockInc]);
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Ver detalles'));
    expect(getByText(/Incidencia #1/)).toBeTruthy();
    expect(getByText('Conductor')).toBeTruthy();
    fireEvent.press(getByText('Cerrar'));
  });

  test('incidencia with arxiu shows image container', async () => {
    const incWithImg = { ...mockInc, arxiu: 'https://example.com/img.jpg' };
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([incWithImg]);
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estacion/);
    fireEvent.press(getByText('Ver detalles'));
    await waitFor(() => {
      expect(getByText('Imagen adjunta')).toBeTruthy();
    });
  });

  test('incidencia with motiu_rebuig shows motivo row', async () => {
    const incRejectedWithMotiu = { ...mockIncRejected, motiu_rebuig: 'No aplica' };
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([incRejectedWithMotiu]);
    const { findByText, getByText } = render(<AdminIncidenciasScreen />);
    await findByText('Rechazada');
    fireEvent.press(getByText('Ver detalles'));
    await waitFor(() => {
      expect(getByText('No aplica')).toBeTruthy();
    });
  });

  test('incidencia without estacio_nom shows fallback', async () => {
    const incNoName = { ...mockInc, estacio_nom: null, estacio_municipi: null };
    (listPendingIncidencias as jest.Mock<any>).mockResolvedValue([incNoName]);
    const { findByText } = render(<AdminIncidenciasScreen />);
    await findByText(/Estaci/);
  });
});
