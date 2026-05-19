import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as Haptics from 'expo-haptics';

jest.mock('@/utils/expoPlatform', () => ({
  shouldUseIosTabHaptic: jest.fn(),
}));

jest.unmock('@/components/haptic-tab');

import { HapticTab } from '@/components/haptic-tab';
import { shouldUseIosTabHaptic } from '@/utils/expoPlatform';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@react-navigation/elements', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    PlatformPressable: ({
      onPressIn,
      children,
      testID,
      ...rest
    }: {
      onPressIn?: (ev: unknown) => void;
      children?: React.ReactNode;
      testID?: string;
    }) =>
      React.createElement(
        Pressable,
        { testID: testID ?? 'platform-pressable', onPressIn, ...rest },
        children
      ),
  };
});

describe('HapticTab', () => {
  const originalExpoOs = process.env.EXPO_OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (shouldUseIosTabHaptic as jest.Mock).mockReturnValue(true);
    process.env.EXPO_OS = 'ios';
  });

  afterEach(() => {
    process.env.EXPO_OS = originalExpoOs;
  });

  test('dispara haptic en iOS al presionar', () => {
    const onPressIn = jest.fn();
    const { getByTestId } = render(
      <HapticTab onPressIn={onPressIn} accessibilityRole="button">
        Tab
      </HapticTab>
    );

    fireEvent(getByTestId('platform-pressable'), 'pressIn', { nativeEvent: {} });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(onPressIn).toHaveBeenCalled();
  });

  test('no dispara haptic si no es iOS', () => {
    (shouldUseIosTabHaptic as jest.Mock).mockReturnValue(false);
    const { getByTestId } = render(
      <HapticTab accessibilityRole="button">{null}</HapticTab>
    );
    fireEvent(getByTestId('platform-pressable'), 'pressIn', { nativeEvent: {} });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  test('funciona sin onPressIn del padre', () => {
    (shouldUseIosTabHaptic as jest.Mock).mockReturnValue(true);
    const { getByTestId } = render(
      <HapticTab accessibilityRole="button">{null}</HapticTab>
    );
    expect(() =>
      fireEvent(getByTestId('platform-pressable'), 'pressIn', { nativeEvent: {} })
    ).not.toThrow();
  });
});
