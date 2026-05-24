import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, test, expect, jest } from '@jest/globals';
import { ManualStationCard } from '@/components/stations/ManualStationCard';
import { ManualStation } from '@/components/stations/types';

const mockStation: ManualStation = {
  id: 1,
  nom: 'Estacion de Prueba',
  created_at: '2024-06-15T10:00:00Z',
  latitud: 41.3,
  longitud: 2.1,
  kw: 22,
  ac_dc: 'AC',
  tipus_connexio: 'Type2',
  tipus_velocitat: 'Normal',
  adreca: 'Calle Test 1',
  municipi: 'Barcelona',
  provincia: 'Barcelona',
  promotor: 'Test SA',
  acces: 'Publico',
};

describe('ManualStationCard', () => {
  test('renders station name', () => {
    const { getByText } = render(
      <ManualStationCard station={mockStation} onEdit={jest.fn() as any} onDelete={jest.fn() as any} />
    );
    expect(getByText('Estacion de Prueba')).toBeTruthy();
  });

  test('renders municipality and province', () => {
    const { getByText } = render(
      <ManualStationCard station={mockStation} onEdit={jest.fn() as any} onDelete={jest.fn() as any} />
    );
    expect(getByText(/Barcelona/)).toBeTruthy();
  });

  test('renders kW and AC/DC info', () => {
    const { getByText } = render(
      <ManualStationCard station={mockStation} onEdit={jest.fn() as any} onDelete={jest.fn() as any} />
    );
    expect(getByText(/22 kW/)).toBeTruthy();
    expect(getByText(/AC/)).toBeTruthy();
  });

  test('shows Sin municipio when no municipality', () => {
    const station = { ...mockStation, municipi: undefined, provincia: undefined };
    const { getByText } = render(
      <ManualStationCard station={station} onEdit={jest.fn() as any} onDelete={jest.fn() as any} />
    );
    expect(getByText(/Sin municipio/)).toBeTruthy();
  });

  test('renders edit button and calls onEdit', () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <ManualStationCard station={mockStation} onEdit={onEdit as any} onDelete={jest.fn() as any} />
    );
    fireEvent.press(getByText('Editar'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  test('renders delete button and calls onDelete', () => {
    const onDelete = jest.fn();
    const { getByText } = render(
      <ManualStationCard station={mockStation} onEdit={jest.fn() as any} onDelete={onDelete as any} />
    );
    fireEvent.press(getByText('Borrar'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('shows 0 kW when kw is undefined', () => {
    const station = { ...mockStation, kw: undefined };
    const { getByText } = render(
      <ManualStationCard station={station} onEdit={jest.fn() as any} onDelete={jest.fn() as any} />
    );
    expect(getByText(/0 kW/)).toBeTruthy();
  });

  test('does not show ac_dc info when ac_dc is null', () => {
    const station = { ...mockStation, ac_dc: null };
    const { getByText, queryByText } = render(
      <ManualStationCard station={station} onEdit={jest.fn() as any} onDelete={jest.fn() as any} />
    );
    expect(getByText(/22 kW/)).toBeTruthy();
    expect(queryByText(/· AC/)).toBeNull();
  });

  test('does not show province when provincia is undefined', () => {
    const station = { ...mockStation, provincia: undefined };
    const { getByText, queryByText } = render(
      <ManualStationCard station={station} onEdit={jest.fn() as any} onDelete={jest.fn() as any} />
    );
    expect(getByText('Barcelona ')).toBeTruthy();
    expect(queryByText(/· Barcelona/)).toBeNull();
  });
});