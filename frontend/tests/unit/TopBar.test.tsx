import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import TopBar, { MapSearchListItem } from '@/components/TopBar';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

describe('TopBar (búsqueda mapa / estaciones)', () => {
  const baseProps = {
    onPressMenu: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    searchResults: [] as MapSearchListItem[],
    onSelectResult: jest.fn(),
    isSearching: false,
    searchMode: 'stations' as const,
    onToggleSearchMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // en modo estaciones, el texto de la barra de búsqueda debe ser "Buscar puntos de carga".
  test('modo estaciones: placeholder de puntos de recarga', () => {
    const { getByPlaceholderText } = render(<TopBar {...baseProps} />);
    expect(getByPlaceholderText('Buscar puntos de carga')).toBeTruthy();
  });

  // en modo direcciones, el texto de la barra de búsqueda debe ser "Dirección, calle…".
  test('modo direcciones: placeholder de dirección', () => {
    const { getByPlaceholderText } = render(<TopBar {...baseProps} searchMode="addresses" />);
    expect(getByPlaceholderText('Dirección, calle…')).toBeTruthy();
  });

  // al pulsar una fila de estación, el padre recibe el objeto completo con `kind: 'station'`.
  test('seleccionar resultado de estación llama a onSelectResult con kind station', () => {
    const onSelectResult = jest.fn();
    const item: MapSearchListItem = {
      kind: 'station',
      station: { id: 9, nom: 'E1', adreca: 'C A', municipi: 'BCN' },
    };
    const { getByText } = render(
      <TopBar {...baseProps} searchQuery="xx" searchResults={[item]} onSelectResult={onSelectResult} />
    );
    fireEvent.press(getByText('E1'));
    expect(onSelectResult).toHaveBeenCalledWith(item);
  });

  // Al pulsar una predicción de dirección, el padre recibe `kind: 'address'` y el `placeId`.
  test('seleccionar resultado de dirección llama a onSelectResult con kind address', () => {
    const onSelectResult = jest.fn();
    const item: MapSearchListItem = {
      kind: 'address',
      placeId: 'ChIJ123',
      label: 'Carrer Major',
      subtitle: 'Girona',
    };
    const { getByText } = render(
      <TopBar
        {...baseProps}
        searchMode="addresses"
        searchQuery="xx"
        searchResults={[item]}
        onSelectResult={onSelectResult}
      />
    );
    fireEvent.press(getByText('Carrer Major'));
    expect(onSelectResult).toHaveBeenCalledWith(item);
  });
});
