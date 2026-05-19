import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as RN from 'react-native';

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Canvas: ({
      children,
      style,
    }: {
      children?: React.ReactNode;
      style?: object;
    }) => React.createElement(View, { testID: 'skia-canvas', style }, children),
    Circle: () => React.createElement(View, { testID: 'skia-circle' }),
    Group: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'skia-group' }, children),
    useClockValue: () => ({ current: 2000 }),
    useComputedValue: (fn: () => number) => ({ current: fn() }),
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: (props: { children?: React.ReactNode; style?: object }) =>
        React.createElement(View, props),
    },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withRepeat: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    interpolate: (value: number, _in: number[], out: number[]) =>
      value < 0.5 ? out[0] : out[out.length - 1],
    Easing: { linear: 'linear' },
  };
});

import MagicRingsBackground from '@/components/MagicRingsBackground';

describe('MagicRingsBackground', () => {
  beforeEach(() => {
    jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({
      width: 400,
      height: 800,
      scale: 2,
      fontScale: 1,
    });
  });

  test('usa capa Skia en pantalla completa', () => {
    const { getByTestId, getAllByTestId } = render(
      <MagicRingsBackground
        color="#85f755"
        colorTwo="#63f187"
        ringCount={3}
        speed={1}
        opacity={0.8}
        fullScreen
      />
    );

    expect(getByTestId('skia-canvas')).toBeTruthy();
    expect(getAllByTestId('skia-group').length).toBe(3);
  });

  test('onLayout habilita Skia cuando no es fullScreen', () => {
    const { UNSAFE_getByType, getByTestId } = render(
      <MagicRingsBackground
        color="#111111"
        colorTwo="#222222"
        ringCount={2}
        speed={0.5}
        opacity={1}
        fullScreen={false}
      />
    );

    const { View } = require('react-native');
    const container = UNSAFE_getByType(View);
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { width: 300, height: 200, x: 0, y: 0 } },
    });

    expect(getByTestId('skia-canvas')).toBeTruthy();
  });

  test('mezcla colores hex cortos (#abc)', () => {
    const { getAllByTestId } = render(
      <MagicRingsBackground
        color="#abc"
        colorTwo="#def"
        ringCount={2}
        speed={1}
        opacity={1}
        fullScreen
      />
    );
    expect(getAllByTestId('skia-circle').length).toBeGreaterThan(0);
  });

  test('ringCount 1 no divide por cero en mezcla de color', () => {
    const { getByTestId } = render(
      <MagicRingsBackground
        color="#ffffff"
        colorTwo="#000000"
        ringCount={1}
        speed={1}
        opacity={0.5}
        fullScreen
      />
    );
    expect(getByTestId('skia-canvas')).toBeTruthy();
  });
});
