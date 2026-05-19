import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn(() => '#ffffff'),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'dark'),
}));

jest.mock('@/components/themed-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ThemedView: ({ children, style }: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { testID: 'themed-view', style }, children),
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');
  const Animated = {
    ScrollView: React.forwardRef(
      (props: { children?: React.ReactNode; style?: object }, ref: unknown) =>
        React.createElement(ScrollView, { testID: 'parallax-scroll', ref, ...props })
    ),
    View: (props: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { testID: 'parallax-header', ...props }),
  };
  return {
    __esModule: true,
    default: Animated,
    useAnimatedRef: () => ({ current: null }),
    useScrollOffset: () => ({ value: 0 }),
    useAnimatedStyle: (fn: () => object) => fn(),
    interpolate: () => 0,
  };
});

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

describe('ParallaxScrollView', () => {
  test('renderiza header, contenido y scroll', () => {
    const { getByTestId, getByText } = render(
      <ParallaxScrollView
        headerImage={<Text testID="header-img">IMG</Text>}
        headerBackgroundColor={{ light: '#eee', dark: '#111' }}
      >
        <Text>Cuerpo</Text>
      </ParallaxScrollView>
    );

    expect(getByTestId('parallax-scroll')).toBeTruthy();
    expect(getByTestId('parallax-header')).toBeTruthy();
    expect(getByTestId('header-img')).toBeTruthy();
    expect(getByText('Cuerpo')).toBeTruthy();
    expect(getByTestId('themed-view')).toBeTruthy();
  });

  test('usa color de fondo del header según esquema oscuro', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    const { getByTestId } = render(
      <ParallaxScrollView
        headerImage={<Text>H</Text>}
        headerBackgroundColor={{ light: '#eee', dark: '#222' }}
      >
        <Text />
      </ParallaxScrollView>
    );

    const header = getByTestId('parallax-header');
    const flatStyle = Array.isArray(header.props.style)
      ? Object.assign({}, ...header.props.style)
      : header.props.style;
    expect(flatStyle.backgroundColor).toBe('#222');
  });

  test('usa color de fondo del header en modo claro', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { getByTestId } = render(
      <ParallaxScrollView
        headerImage={<Text>H</Text>}
        headerBackgroundColor={{ light: '#eee', dark: '#222' }}
      >
        <Text />
      </ParallaxScrollView>
    );

    const header = getByTestId('parallax-header');
    const flatStyle = Array.isArray(header.props.style)
      ? Object.assign({}, ...header.props.style)
      : header.props.style;
    expect(flatStyle.backgroundColor).toBe('#eee');
  });
});
