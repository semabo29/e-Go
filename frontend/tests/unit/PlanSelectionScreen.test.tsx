import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as RN from 'react-native';

jest.mock('@/components/MagicRingsBackground', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'magic-rings' }),
  };
});

import PlanSelectionScreen from '@/screens/PlanSelectionScreen';

describe('PlanSelectionScreen', () => {
  beforeEach(() => {
    jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
  });

  test('plan free muestra precio y CTAs de suscripción', () => {
    const onSubscribe = jest.fn();
    const onContinueFree = jest.fn();

    const { getByText, getByTestId } = render(
      <PlanSelectionScreen
        currentPlan="free"
        onSubscribePress={onSubscribe}
        onContinueFreePress={onContinueFree}
      />
    );

    expect(getByTestId('magic-rings')).toBeTruthy();
    expect(getByText('PREMIUM')).toBeTruthy();
    expect(getByText('4,99€/mes')).toBeTruthy();
    expect(getByText('Suscribirme ahora')).toBeTruthy();
    expect(getByText('Continuar con el plan gratuito')).toBeTruthy();

    fireEvent.press(getByText('Suscribirme ahora'));
    fireEvent.press(getByText('Continuar con el plan gratuito'));
    expect(onSubscribe).toHaveBeenCalled();
    expect(onContinueFree).toHaveBeenCalled();
  });

  test('plan premium muestra beneficios y cambio a gratuito', () => {
    const onChangeToFree = jest.fn();

    const { getByText } = render(
      <PlanSelectionScreen
        currentPlan="premium"
        onChangeToFreePress={onChangeToFree}
      />
    );

    expect(getByText('Tu plan Premium ✦')).toBeTruthy();
    expect(getByText('Sin anuncios')).toBeTruthy();
    expect(getByText('Soporte prioritario')).toBeTruthy();
    expect(getByText('Plan Gratuito — funciones básicas')).toBeTruthy();

    fireEvent.press(getByText('Cambiar a gratuito'));
    expect(onChangeToFree).toHaveBeenCalled();
  });

  test('plan premium lista todos los beneficios', () => {
    const { getByText } = render(
      <PlanSelectionScreen currentPlan="premium" />
    );

    expect(getByText('Acceso ilimitado a todas las funciones')).toBeTruthy();
    expect(getByText('Actualizaciones anticipadas')).toBeTruthy();
    expect(getByText('Exportación de datos')).toBeTruthy();
  });
});
