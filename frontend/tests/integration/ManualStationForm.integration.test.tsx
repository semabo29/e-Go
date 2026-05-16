import React, { useState } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/app/_components/MapWrapper', () => ({
  MapView: ({ children, onPress }: { children?: React.ReactNode; onPress?: (e: any) => void }) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'map-view' },
      React.createElement(
        TouchableOpacity,
        {
          testID: 'map-press',
          onPress: () => onPress?.({ nativeEvent: { coordinate: { latitude: 41.5, longitude: 2.1 } } }),
        },
        React.createElement(Text, null, 'Map')
      ),
      children
    );
  },
  Marker: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'map-marker' });
  },
}));

jest.mock('@/services/geoService', () => ({
  searchGeoAddress: jest.fn(),
  reverseGeoAddress: jest.fn(),
}));

jest.mock('@/constants/api', () => ({
  getApiUrl: jest.fn(() => 'http://test.api'),
}));

jest.mock('@/constants/catalunyaMunicipalities.json', () => ({
  Barcelona: ['Barcelona', 'Badalona', 'Terrassa'],
  Girona: ['Girona', 'Blanes'],
  Lleida: ['Lleida'],
  Tarragona: ['Tarragona'],
}));

import { ManualStationForm } from '@/components/stations/ManualStationForm';
import { FormState, initialStationFormState } from '@/components/stations/types';
import { searchGeoAddress, reverseGeoAddress } from '@/services/geoService';

function ControlledForm({
  onSubmit = jest.fn() as any,
  onBack = jest.fn() as any,
  initialForm = initialStationFormState,
  loading = false,
  error = '',
  success = '',
}: {
  onSubmit?: jest.Mock;
  onBack?: jest.Mock;
  initialForm?: FormState;
  loading?: boolean;
  error?: string;
  success?: string;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const handleChange = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <ManualStationForm
      title="Crear estacion"
      subtitle="Completa el formulario"
      submitLabel="Guardar"
      loading={loading}
      error={error}
      success={success}
      form={form}
      onChange={handleChange}
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
}

describe('ManualStationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (searchGeoAddress as jest.Mock).mockResolvedValue([]);
    (reverseGeoAddress as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders title and subtitle', () => {
    const { getByText } = render(<ControlledForm />);
    expect(getByText('Crear estacion')).toBeTruthy();
    expect(getByText(/Completa el formulario/)).toBeTruthy();
  });

  test('renders station name input', () => {
    const { getByPlaceholderText } = render(<ControlledForm />);
    expect(getByPlaceholderText('Nombre de la estacion')).toBeTruthy();
  });

  test('renders latitud and longitud inputs', () => {
    const { getByPlaceholderText } = render(<ControlledForm />);
    expect(getByPlaceholderText('Latitud')).toBeTruthy();
    expect(getByPlaceholderText('Longitud')).toBeTruthy();
  });

  test('submit button renders with submitLabel', () => {
    const { getByText } = render(<ControlledForm />);
    expect(getByText('Guardar')).toBeTruthy();
  });

  test('submit button calls onSubmit', () => {
    const onSubmit = jest.fn();
    const { getByText } = render(<ControlledForm onSubmit={onSubmit as any} />);
    fireEvent.press(getByText('Guardar'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('back button calls onBack', () => {
    const onBack = jest.fn();
    const { getByText } = render(<ControlledForm onBack={onBack as any} />);
    fireEvent.press(getByText('Volver'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('shows error text when error prop is provided', () => {
    const { getByText } = render(<ControlledForm error="Error de prueba" />);
    expect(getByText('Error de prueba')).toBeTruthy();
  });

  test('shows success text when success prop is provided', () => {
    const { getByText } = render(<ControlledForm success="Guardado correctamente" />);
    expect(getByText('Guardado correctamente')).toBeTruthy();
  });

  test('does not show error when error is empty', () => {
    const { queryByText } = render(<ControlledForm error="" />);
    expect(queryByText('Error de prueba')).toBeNull();
  });

  test('shows activity indicator when loading', () => {
    const { queryByText } = render(<ControlledForm loading={true} />);
    expect(queryByText('Guardar')).toBeNull();
  });

  test('typing in nom input updates form', async () => {
    const { getByPlaceholderText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Nombre de la estacion'), 'Mi estacion');
    expect(getByPlaceholderText('Nombre de la estacion').props.value).toBe('Mi estacion');
  });

  test('typing in latitud updates form', () => {
    const { getByPlaceholderText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Latitud'), '41.5');
    expect(getByPlaceholderText('Latitud').props.value).toBe('41.5');
  });

  test('map button opens map modal', () => {
    const { getByText, queryByTestId } = render(<ControlledForm />);
    fireEvent.press(getByText('Seleccionar en el mapa'));
    expect(queryByTestId('map-view')).toBeTruthy();
  });

  test('map modal close button can be pressed without error', () => {
    const { getByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Seleccionar en el mapa'));
    expect(getByText('Selecciona ubicacion')).toBeTruthy();
    fireEvent.press(getByText('Cerrar'));
  });

  test('AC/DC picker button opens picker modal', () => {
    const { getByText, getByPlaceholderText } = render(<ControlledForm />);
    const kwInput = getByPlaceholderText('Potencia (kW)');
    expect(kwInput).toBeTruthy();
    fireEvent.press(getByText('AC/DC'));
    expect(getByText('Selecciona AC/DC')).toBeTruthy();
  });

  test('AC/DC picker selects AC option', async () => {
    const { getByText, getAllByText } = render(<ControlledForm />);
    fireEvent.press(getByText('AC/DC'));
    const acOptions = getAllByText('AC');
    fireEvent.press(acOptions[acOptions.length - 1]);
    fireEvent.press(getByText('Cerrar'));
  });

  test('tipo de conexion picker opens', () => {
    const { getByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Tipo de conexion'));
    expect(getByText(/Selecciona tipo de conexion/)).toBeTruthy();
  });

  test('tipo de conexion picker selects MENNEKES.M', async () => {
    const { getByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Tipo de conexion'));
    fireEvent.press(getByText('MENNEKES.M'));
    fireEvent.press(getByText('Cerrar'));
    await waitFor(() => {
      expect(getByText('MENNEKES.M')).toBeTruthy();
    });
  });

  test('tipo de velocidad picker opens', () => {
    const { getByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Tipo de velocidad'));
    expect(getByText(/Selecciona tipo de velocidad/)).toBeTruthy();
  });

  test('province picker opens', () => {
    const { getByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Provincia'));
    expect(getByText('Selecciona provincia')).toBeTruthy();
  });

  test('province picker selects a province', async () => {
    const { getByText, getAllByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Provincia'));
    const barcelonaOpts = getAllByText('Barcelona');
    fireEvent.press(barcelonaOpts[barcelonaOpts.length - 1]);
    await waitFor(() => {
      expect(getAllByText('Barcelona').length).toBeGreaterThan(0);
    });
  });

  test('municipality picker opens when province is selected', async () => {
    const { getByText, getAllByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Provincia'));
    const barcelonaOpts = getAllByText('Barcelona');
    fireEvent.press(barcelonaOpts[barcelonaOpts.length - 1]);
    await waitFor(() => {
      fireEvent.press(getByText('Municipio'));
    });
    expect(getByText('Selecciona municipio')).toBeTruthy();
  });

  test('municipality picker selects a municipality', async () => {
    const { getByText, getAllByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Provincia'));
    fireEvent.press(getAllByText('Barcelona')[getAllByText('Barcelona').length - 1]);
    await waitFor(() => {
      fireEvent.press(getByText('Municipio'));
    });
    expect(getByText('Selecciona municipio')).toBeTruthy();
    fireEvent.press(getByText('Badalona'));
    await waitFor(() => {
      expect(getByText('Badalona')).toBeTruthy();
    });
  });

  test('municipality search filters options', async () => {
    const { getByText, getAllByText, getByPlaceholderText, queryByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Provincia'));
    fireEvent.press(getAllByText('Barcelona')[getAllByText('Barcelona').length - 1]);
    await waitFor(() => fireEvent.press(getByText('Municipio')));
    fireEvent.changeText(getByPlaceholderText('Buscar municipio'), 'Terra');
    await waitFor(() => {
      expect(getByText('Terrassa')).toBeTruthy();
      expect(queryByText('Badalona')).toBeNull();
    });
  });

  test('address input triggers geo search after debounce', async () => {
    (searchGeoAddress as jest.Mock).mockResolvedValue([
      { formattedAddress: 'Calle Test 1', lat: 41.4, lng: 2.2, municipi: 'Barcelona', provincia: 'Barcelona' },
    ]);
    const { getByPlaceholderText, findByText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Direccion'), 'Calle');
    act(() => { jest.advanceTimersByTime(400); });
    await findByText('Calle Test 1');
  });

  test('address input with less than 3 chars does not search', async () => {
    const { getByPlaceholderText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Direccion'), 'Ca');
    act(() => { jest.advanceTimersByTime(400); });
    expect(searchGeoAddress).not.toHaveBeenCalled();
  });

  test('clicking geo suggestion applies address', async () => {
    (searchGeoAddress as jest.Mock).mockResolvedValue([
      { formattedAddress: 'Calle Test 1, Barcelona', lat: 41.4, lng: 2.2, municipi: 'Barcelona', provincia: 'Barcelona' },
    ]);
    const { getByPlaceholderText, findByText, getByText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Direccion'), 'Calle');
    act(() => { jest.advanceTimersByTime(400); });
    await findByText('Calle Test 1, Barcelona');
    fireEvent.press(getByText('Calle Test 1, Barcelona'));
    await waitFor(() => {
      expect(getByPlaceholderText('Latitud').props.value).toBe('41.4');
    });
  });

  test('map press sets picked coordinates', async () => {
    (reverseGeoAddress as jest.Mock).mockResolvedValue({
      formattedAddress: 'Test Addr', lat: 41.5, lng: 2.1, municipi: 'Test', provincia: 'Barcelona',
    });
    const { getByText, getByTestId } = render(<ControlledForm />);
    fireEvent.press(getByText('Seleccionar en el mapa'));
    fireEvent.press(getByTestId('map-press'));
    fireEvent.press(getByText('Usar esta ubicacion'));
    await waitFor(() => {
      expect(reverseGeoAddress).toHaveBeenCalledWith(41.5, 2.1);
    });
  });

  test('map press with no reverse result shows message', async () => {
    (reverseGeoAddress as jest.Mock).mockResolvedValue(null);
    const { getByText, getByTestId, findByText } = render(<ControlledForm />);
    fireEvent.press(getByText('Seleccionar en el mapa'));
    fireEvent.press(getByTestId('map-press'));
    fireEvent.press(getByText('Usar esta ubicacion'));
    await findByText(/No se encontro direccion/);
  });

  test('promotor input updates form', () => {
    const { getByPlaceholderText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Promotor/gestor'), 'Test SA');
    expect(getByPlaceholderText('Promotor/gestor').props.value).toBe('Test SA');
  });

  test('acceso input updates form', () => {
    const { getByPlaceholderText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Acceso'), 'Publico');
    expect(getByPlaceholderText('Acceso').props.value).toBe('Publico');
  });

  test('shows section titles', () => {
    const { getByText } = render(<ControlledForm />);
    expect(getByText('Basico')).toBeTruthy();
    expect(getByText('Conector y velocidad')).toBeTruthy();
    expect(getByText('Direccion')).toBeTruthy();
    expect(getByText('Operador')).toBeTruthy();
  });

  test('municipality picker search shows no results message', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = render(<ControlledForm />);
    fireEvent.press(getByText('Provincia'));
    fireEvent.press(getAllByText('Barcelona')[getAllByText('Barcelona').length - 1]);
    await waitFor(() => fireEvent.press(getByText('Municipio')));
    fireEvent.changeText(getByPlaceholderText('Buscar municipio'), 'zzznomatch');
    await waitFor(() => {
      expect(getByText(/No se han encontrado municipios/)).toBeTruthy();
    });
  });

  test('geo search error is handled silently', async () => {
    (searchGeoAddress as jest.Mock).mockRejectedValue(new Error('Network error'));
    const { getByPlaceholderText } = render(<ControlledForm />);
    fireEvent.changeText(getByPlaceholderText('Direccion'), 'Calle error');
    act(() => { jest.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(searchGeoAddress).toHaveBeenCalled();
    });
  });
});