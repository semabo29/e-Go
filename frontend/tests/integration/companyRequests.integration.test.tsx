import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn<any>();
const mockListCompanyRequests = jest.fn<any>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/services/stationModeration', () => ({
  listCompanyRequests: (...args: any[]) => mockListCompanyRequests(...args),
}));

jest.mock('@/components/stations/StationRequestCard', () => ({
  StationRequestCard: ({ request }: { request: { id: number } }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `Solicitud #${request.id}`);
  },
}));

import CompanyRequestsScreen from '@/app/company-requests';

const mockRequest = {
  id: 10,
  station_id: null,
  empresa_id: 1,
  action: 'create' as const,
  payload: {},
  status: 'pending' as const,
  created_at: '2024-06-15T10:00:00Z',
  reviewed_at: null,
  rejection_reason: null,
};

describe('CompanyRequestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows empty message when no requests', async () => {
    mockListCompanyRequests.mockResolvedValue([]);
    const { findByText } = render(<CompanyRequestsScreen />);
    await findByText(/No tienes solicitudes/);
  });

  test('shows requests list', async () => {
    mockListCompanyRequests.mockResolvedValue([mockRequest]);
    const { findByText } = render(<CompanyRequestsScreen />);
    await findByText('Solicitud #10');
  });

  test('back button navigates to company-home', async () => {
    mockListCompanyRequests.mockResolvedValue([]);
    const { findByText, getByText } = render(<CompanyRequestsScreen />);
    await findByText(/No tienes solicitudes/);
    fireEvent.press(getByText('Volver al panel'));
    expect(mockReplace).toHaveBeenCalledWith('/company-home');
  });

  test('refresh button reloads data', async () => {
    mockListCompanyRequests.mockResolvedValue([]);
    const { findByText, getByText } = render(<CompanyRequestsScreen />);
    await findByText(/No tienes solicitudes/);
    fireEvent.press(getByText('Actualizar'));
    expect(mockListCompanyRequests).toHaveBeenCalledTimes(2);
  });

  test('shows NO_SESSION error message', async () => {
    mockListCompanyRequests.mockRejectedValue(new Error('NO_SESSION'));
    const { findByText } = render(<CompanyRequestsScreen />);
    await findByText(/No hay sesion de empresa/);
  });

  test('shows generic error message on other errors', async () => {
    mockListCompanyRequests.mockRejectedValue(new Error('Server error'));
    const { findByText } = render(<CompanyRequestsScreen />);
    await findByText(/solicitudes/);
  });

  test('shows title', async () => {
    mockListCompanyRequests.mockResolvedValue([]);
    const { findByText } = render(<CompanyRequestsScreen />);
    await findByText('Mis solicitudes');
  });
});