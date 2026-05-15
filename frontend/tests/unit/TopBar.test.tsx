import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import TopBar, { MapSearchListItem } from '@/components/TopBar';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => (
      <Text accessibilityLabel={`icon-${name}`}>{name}</Text>
    ),
  };
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

  // En modo estaciones, el placeholder debe invitar a buscar puntos de recarga.
  test('modo estaciones: placeholder de puntos de recarga', () => {
    const { getByPlaceholderText } = render(<TopBar {...baseProps} />);
    expect(getByPlaceholderText('Buscar puntos de carga')).toBeTruthy();
  });

  // En modo direcciones, el placeholder cambia al vocabulario de calles.
  test('modo direcciones: placeholder de dirección', () => {
    const { getByPlaceholderText } = render(<TopBar {...baseProps} searchMode="addresses" />);
    expect(getByPlaceholderText('Dirección, calle…')).toBeTruthy();
  });

  // al pulsar una fila de estación se llama a onSelectResult con kind station
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

  // Al pulsar una predicción de dirección, el padre recibe kind address y el placeId.
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

  // El botón de menú debe abrir el menú en la pantalla 
  test('pulsar el icono de menú llama a onPressMenu', () => {
    const onPressMenu = jest.fn();
    const { getByText } = render(<TopBar {...baseProps} onPressMenu={onPressMenu} />);
    fireEvent.press(getByText('menu'));
    expect(onPressMenu).toHaveBeenCalledTimes(1);
  });

  // El interruptor de modo dispara onToggleSearchMode (estaciones a direcciones o viceversa)
  test('pulsar el toggle de modo llama a onToggleSearchMode', () => {
    const onToggleSearchMode = jest.fn();
    const { getByTestId } = render(
      <TopBar {...baseProps} onToggleSearchMode={onToggleSearchMode} />
    );
    fireEvent.press(getByTestId('topbar-search-mode-toggle'));
    expect(onToggleSearchMode).toHaveBeenCalledTimes(1);
  });

  // Escribir en el campo de búsqueda propaga el texto al estado del padre
  test('escribir en el buscador llama a setSearchQuery', () => {
    const setSearchQuery = jest.fn();
    const { getByPlaceholderText } = render(
      <TopBar {...baseProps} setSearchQuery={setSearchQuery} />
    );
    fireEvent.changeText(getByPlaceholderText('Buscar puntos de carga'), 'barcelona');
    expect(setSearchQuery).toHaveBeenCalledWith('barcelona');
  });

  // Con texto en la barra y sin búsqueda activa se limpia el texto al pulsar la cruz
  test('icono de limpiar vacía la consulta cuando hay texto y no está buscando', () => {
    const setSearchQuery = jest.fn();
    const { getByText } = render(
      <TopBar {...baseProps} searchQuery="abc" setSearchQuery={setSearchQuery} isSearching={false} />
    );
    fireEvent.press(getByText('close-circle'));
    expect(setSearchQuery).toHaveBeenCalledWith('');
  });

  // widget de carga mientras se busca
  test('muestra ActivityIndicator cuando isSearching es true', () => {
    const { UNSAFE_getByType } = render(
      <TopBar {...baseProps} searchQuery="abc" isSearching={true} />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  // Con consulta vacía no debe mostrarse resultados de búsqueda
  test('no muestra desplegable si searchQuery está vacío', () => {
    const { queryByText } = render(
      <TopBar
        {...baseProps}
        searchResults={[
          { kind: 'station', station: { id: 1, nom: 'Visible', adreca: 'A', municipi: 'B' } },
        ]}
      />
    );
    expect(queryByText('Visible')).toBeNull();
  });

  // si no se ha encontrado nada se muestra un mensaje de no se han encontrado resultados
  test('muestra mensaje de sin resultados cuando la lista está vacía', () => {
    const { getByText } = render(
      <TopBar {...baseProps} searchQuery="zzz" searchResults={[]} isSearching={false} />
    );
    expect(getByText('No se han encontrado resultados')).toBeTruthy();
  });

  // si la estación no tiene nombre se usa el texto genérico Punto de carga
  test('estación sin nom muestra fallback Punto de carga', () => {
    const item: MapSearchListItem = {
      kind: 'station',
      station: { id: 2, adreca: 'C/ Test', municipi: 'Girona' },
    };
    const { getByText } = render(
      <TopBar {...baseProps} searchQuery="x" searchResults={[item]} />
    );
    expect(getByText('Punto de carga')).toBeTruthy();
  });

  // si la dirección no tiene subtítulo se muestra solo la etiqueta principal
  test('dirección sin subtitle solo muestra la etiqueta principal', () => {
    const item: MapSearchListItem = {
      kind: 'address',
      placeId: 'id-1',
      label: 'Plaça Catalunya',
      subtitle: '',
    };
    const { getByText, queryByText } = render(
      <TopBar {...baseProps} searchMode="addresses" searchQuery="x" searchResults={[item]} />
    );
    expect(getByText('Plaça Catalunya')).toBeTruthy();
    expect(queryByText(',')).toBeNull();
  });

  // cada fila de resultados de estación debe ser pulsable
  test('varios resultados de estación: cada fila dispara onSelectResult', () => {
    const onSelectResult = jest.fn();
    const items: MapSearchListItem[] = [
      { kind: 'station', station: { id: 1, nom: 'Est A', adreca: 'A', municipi: 'X' } },
      { kind: 'station', station: { id: 2, nom: 'Est B', adreca: 'B', municipi: 'Y' } },
    ];
    const { getByText } = render(
      <TopBar {...baseProps} searchQuery="e" searchResults={items} onSelectResult={onSelectResult} />
    );
    fireEvent.press(getByText('Est B'));
    expect(onSelectResult).toHaveBeenCalledWith(items[1]);
  });

  // en modo direcciones activo la etiqueta de accesibilidad invita a volver a estaciones
  test('modo direcciones: accessibilityLabel del toggle invita a puntos de recarga', () => {
    const { getByLabelText } = render(<TopBar {...baseProps} searchMode="addresses" />);
    expect(getByLabelText('Canviar a cerca de punts de recàrrega')).toBeTruthy();
  });

  // en modo estaciones la etiqueta de accesibilidad invita a buscar direcciones
  test('modo estaciones: accessibilityLabel del toggle invita a adreces', () => {
    const { getByLabelText } = render(<TopBar {...baseProps} searchMode="stations" />);
    expect(getByLabelText("Canviar a cerca d'adreces al mapa")).toBeTruthy();
  });
});
