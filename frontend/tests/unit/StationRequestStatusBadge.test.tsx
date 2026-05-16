import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, test, expect } from '@jest/globals';
import { StationRequestStatusBadge } from '@/components/stations/StationRequestStatusBadge';

describe('StationRequestStatusBadge', () => {
  test('renders Pendiente for pending status', () => {
    const { getByText } = render(<StationRequestStatusBadge status="pending" />);
    expect(getByText('Pendiente')).toBeTruthy();
  });

  test('renders Aprobada for approved status', () => {
    const { getByText } = render(<StationRequestStatusBadge status="approved" />);
    expect(getByText('Aprobada')).toBeTruthy();
  });

  test('renders Rechazada for rejected status', () => {
    const { getByText } = render(<StationRequestStatusBadge status="rejected" />);
    expect(getByText('Rechazada')).toBeTruthy();
  });
});