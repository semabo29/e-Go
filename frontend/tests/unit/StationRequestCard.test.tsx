import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, test, expect } from '@jest/globals';
import { StationRequestCard } from '@/components/stations/StationRequestCard';
import { StationRequest } from '@/components/stations/types';

const mockRequest: StationRequest = {
  id: 42,
  station_id: 10,
  empresa_id: 1,
  action: 'create',
  payload: { nom: 'Nueva estacion' },
  status: 'pending',
  created_at: '2024-06-15T10:00:00Z',
  reviewed_at: null,
  rejection_reason: null,
  empresa_nombre: 'Mi Empresa SA',
  empresa_email: 'empresa@test.com',
  empresa_username: 'empresa_user',
};

describe('StationRequestCard', () => {
  test('renders request id', () => {
    const { getByText } = render(<StationRequestCard request={mockRequest} />);
    expect(getByText(/Solicitud #42/)).toBeTruthy();
  });

  test('renders action in uppercase', () => {
    const { getByText } = render(<StationRequestCard request={mockRequest} />);
    expect(getByText(/CREATE/)).toBeTruthy();
  });

  test('renders status badge', () => {
    const { getByText } = render(<StationRequestCard request={mockRequest} />);
    expect(getByText('Pendiente')).toBeTruthy();
  });

  test('shows company name when showCompany is true and empresa_nombre exists', () => {
    const { getByText } = render(<StationRequestCard request={mockRequest} showCompany />);
    expect(getByText(/Mi Empresa SA/)).toBeTruthy();
  });

  test('hides company name when showCompany is false', () => {
    const { queryByText } = render(<StationRequestCard request={mockRequest} showCompany={false} />);
    expect(queryByText(/Mi Empresa SA/)).toBeNull();
  });

  test('hides company name when empresa_nombre is null', () => {
    const request = { ...mockRequest, empresa_nombre: null };
    const { queryByText } = render(<StationRequestCard request={request} showCompany />);
    expect(queryByText(/Empresa:/)).toBeNull();
  });

  test('shows rejection reason when present', () => {
    const request = { ...mockRequest, rejection_reason: 'Documentacion incompleta' };
    const { getByText } = render(<StationRequestCard request={request} />);
    expect(getByText(/Documentacion incompleta/)).toBeTruthy();
  });

  test('hides rejection reason when null', () => {
    const { queryByText } = render(<StationRequestCard request={mockRequest} />);
    expect(queryByText(/Motivo:/)).toBeNull();
  });

  test('renders approved status correctly', () => {
    const req = { ...mockRequest, status: 'approved' as const };
    const { getByText } = render(<StationRequestCard request={req} />);
    expect(getByText('Aprobada')).toBeTruthy();
  });

  test('renders rejected status correctly', () => {
    const req = { ...mockRequest, status: 'rejected' as const };
    const { getByText } = render(<StationRequestCard request={req} />);
    expect(getByText('Rechazada')).toBeTruthy();
  });
});