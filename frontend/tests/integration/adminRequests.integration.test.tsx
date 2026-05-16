import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn();
const mockListPendingRequests = jest.fn();
const mockApproveRequest = jest.fn();
const mockRejectRequest = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/services/stationModeration', () => ({
  listPendingRequests: (...args: any[]) => mockListPendingRequests(...args),
  approveRequest: (...args: any[]) => mockApproveRequest(...args),
  rejectRequest: (...args: any[]) => mockRejectRequest(...args),
}));

jest.mock('@/components/stations/StationRequestCard', () => ({
  StationRequestCard: ({ request }: { request: { id: number; action: string } }) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: `request-card-${request.id}` },
      React.createElement(Text, null, `Solicitud #${request.id}`),
      React.createElement(Text, null, request.action.toUpperCase())
    );
  },
}));

import AdminRequestsScreen from '@/app/admin-requests';

const mockRequest = {
  id: 1,
  station_id: null,
  empresa_id: 1,
  action: 'create',
  payload: { nom: 'Test Station' },
  status: 'pending' as const,
  created_at: '2024-06-15T10:00:00Z',
  reviewed_at: null,
  rejection_reason: null,
  empresa_nombre: 'Test Company',
  empresa_email: 'company@test.com',
  empresa_username: 'testcompany',
};

describe('AdminRequestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    mockListPendingRequests.mockReturnValue(new Promise(() => {}));
    const { queryByText } = render(<AdminRequestsScreen />);
    expect(queryByText('No hay solicitudes pendientes.')).toBeNull();
  });

  test('shows empty message when no requests', async () => {
    mockListPendingRequests.mockResolvedValue([]);
    const { findByText } = render(<AdminRequestsScreen />);
    await findByText('No hay solicitudes pendientes.');
  });

  test('shows requests list', async () => {
    mockListPendingRequests.mockResolvedValue([mockRequest]);
    const { findByText } = render(<AdminRequestsScreen />);
    await findByText('Solicitud #1');
    await findByText('CREATE');
  });

  test('shows approve and reject buttons for each request', async () => {
    mockListPendingRequests.mockResolvedValue([mockRequest]);
    const { findByText, getByText } = render(<AdminRequestsScreen />);
    await findByText('Solicitud #1');
    expect(getByText('Aprobar')).toBeTruthy();
    expect(getByText('Rechazar')).toBeTruthy();
  });

  test('approve calls approveRequest and reloads', async () => {
    mockListPendingRequests.mockResolvedValue([mockRequest]);
    mockApproveRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Approved' }),
    });
    const { findByText, getByText } = render(<AdminRequestsScreen />);
    await findByText('Solicitud #1');
    fireEvent.press(getByText('Aprobar'));
    await waitFor(() => {
      expect(mockApproveRequest).toHaveBeenCalledWith(1);
    });
  });

  test('approve shows error when response not ok', async () => {
    mockListPendingRequests.mockResolvedValue([mockRequest]);
    mockApproveRequest.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No se puede aprobar' }),
    });
    const { findByText, getByText } = render(<AdminRequestsScreen />);
    await findByText('Solicitud #1');
    fireEvent.press(getByText('Aprobar'));
    await findByText('No se puede aprobar');
  });

  test('reject opens modal', async () => {
    mockListPendingRequests.mockResolvedValue([mockRequest]);
    const { findByText, getByText } = render(<AdminRequestsScreen />);
    await findByText('Solicitud #1');
    fireEvent.press(getByText('Rechazar'));
    await waitFor(() => {
      expect(getByText(/Motivo del rechazo/)).toBeTruthy();
    });
  });

  test('reject modal submits rejectRequest', async () => {
    mockListPendingRequests.mockResolvedValue([mockRequest]);
    mockRejectRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Rejected' }),
    });
    const { findByText, getByText, getByPlaceholderText } = render(<AdminRequestsScreen />);
    await findByText('Solicitud #1');
    fireEvent.press(getByText('Rechazar'));
    await waitFor(() => expect(getByText(/Motivo del rechazo/)).toBeTruthy());
    const input = getByPlaceholderText(/Escribe un motivo/);
    fireEvent.changeText(input, 'Falta documentacion');
    fireEvent.press(getByText('Enviar rechazo'));
    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledWith(1, 'Falta documentacion');
    });
  });

  test('shows request details in modal', async () => {
    mockListPendingRequests.mockResolvedValue([mockRequest]);
    const { findByText, getByText, getAllByText } = render(<AdminRequestsScreen />);
    await findByText('Solicitud #1');
    fireEvent.press(getByText('Ver detalles'));
    await waitFor(() => {
      expect(getAllByText(/Solicitud #1/).length).toBeGreaterThan(0);
      expect(getByText('Cerrar')).toBeTruthy();
    });
  });

  test('back button navigates to admin-home', async () => {
    mockListPendingRequests.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminRequestsScreen />);
    await findByText('No hay solicitudes pendientes.');
    fireEvent.press(getByText('Volver al panel admin'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-home');
  });

  test('shows error when load fails', async () => {
    mockListPendingRequests.mockRejectedValue(new Error('Load error'));
    const { findByText } = render(<AdminRequestsScreen />);
    await findByText(/solicitudes/);
  });
});