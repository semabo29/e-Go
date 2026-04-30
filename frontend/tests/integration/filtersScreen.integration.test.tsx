import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Switch } from 'react-native';

import FiltersScreen from '@/app/filters';

const mockNavigate = jest.fn();
const mockBack = jest.fn();

let mockParams: Record<string, any> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
    back: mockBack,
  }),
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

describe('FiltersScreen integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {
      minKw: '20',
      maxKw: '30',
      connectorType: 'CCS Combo2',
      ac_dc: 'AC',
      showFavorites: 'false',
    };
  });

  // si minKw > maxKw, se muestra error y no se navega.
  test('validation: minKw > maxKw shows error and does not navigate', async () => {
    mockParams = {
      minKw: '40',
      maxKw: '20',
      connectorType: 'CCS Combo2',
      ac_dc: 'AC',
      showFavorites: 'false',
    };

    const { getByText } = render(<FiltersScreen />);

    fireEvent.press(getByText('Aplicar Filtros'));

    expect(getByText('La potencia mínima no puede ser mayor que la máxima')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // al activar "Mis Estaciones" (showFavorites), se navega con el payload esperado incluyendo showFavorites: 'true'.
  test('apply: navigates with expected params (including showFavorites)', async () => {
    const { getByText, UNSAFE_getByType } = render(<FiltersScreen />);

    // Toggle "Mis Estaciones" switch on.
    const switches = UNSAFE_getByType(Switch);
    const switchNode = Array.isArray(switches) ? switches[0] : switches;
    expect(switchNode).toBeTruthy();

    fireEvent(switchNode, 'valueChange', true);

    fireEvent.press(getByText('Aplicar Filtros'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/',
        params: {
          minKw: '20',
          maxKw: '30',
          showFavorites: 'true',
          ac_dc: 'AC',
          connectorType: 'CCS Combo2',
        },
      });
    });
  });

  // resetea minKw/maxKw y limpia los inputs visibles.
  test('clear: resets min/max and connector/corriente inputs', async () => {
    const { getByDisplayValue, queryByDisplayValue, getByText } = render(<FiltersScreen />);

    expect(getByDisplayValue('20')).toBeTruthy();
    expect(getByDisplayValue('30')).toBeTruthy();

    fireEvent.press(getByText('Limpiar'));

    await waitFor(() => {
      expect(queryByDisplayValue('20')).toBeNull();
      expect(queryByDisplayValue('30')).toBeNull();
    });
  });

  // resetea connectorType y ac_dc antes de aplicar filtros.
  test('clear: resets connectorType and ac_dc values before applying', async () => {
    mockParams = {
      minKw: '20',
      maxKw: '30',
      connectorType: 'CCS Combo2',
      ac_dc: 'AC',
      showFavorites: 'false',
    };

    const { getByText } = render(<FiltersScreen />);

    fireEvent.press(getByText('Limpiar'));
    fireEvent.press(getByText('Aplicar Filtros'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/',
        params: {
          minKw: '',
          maxKw: '',
          showFavorites: '',
          ac_dc: '',
          connectorType: '',
        },
      });
    });
  });

  // si solo se proporciona minKw, se navega con maxKw vacío
  test('apply: navigates when only minKw is provided', async () => {
    mockParams = {
      minKw: '20',
      maxKw: '',
      connectorType: '',
      ac_dc: '',
      showFavorites: 'false',
    };

    const { getByText } = render(<FiltersScreen />);
    fireEvent.press(getByText('Aplicar Filtros'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/',
        params: {
          minKw: '20',
          maxKw: '',
          showFavorites: '',
          ac_dc: '',
          connectorType: '',
        },
      });
    });
  });

  // si solo se proporciona maxKw, se navega con minKw vacío.
  test('apply: navigates when only maxKw is provided', async () => {
    mockParams = {
      minKw: '',
      maxKw: '150',
      connectorType: '',
      ac_dc: '',
      showFavorites: 'false',
    };

    const { getByText } = render(<FiltersScreen />);
    fireEvent.press(getByText('Aplicar Filtros'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/',
        params: {
          minKw: '',
          maxKw: '150',
          showFavorites: '',
          ac_dc: '',
          connectorType: '',
        },
      });
    });
  });

  // si todo está vacío (excepto showFavorites), se navega con minKw/maxKw/connectorType/ac_dc como strings vacíos.
  test('apply: navigates when everything is empty', async () => {
    mockParams = {
      showFavorites: 'false',
    };

    const { getByText } = render(<FiltersScreen />);
    fireEvent.press(getByText('Aplicar Filtros'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/',
        params: {
          minKw: '',
          maxKw: '',
          showFavorites: '',
          ac_dc: '',
          connectorType: '',
        },
      });
    });
  });
});

