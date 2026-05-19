import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

jest.unmock('@/components/external-link');

import { ExternalLink } from '@/components/external-link';

const mockPreventDefault = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Link: ({
      href,
      onPress,
      children,
    }: {
      href: string;
      onPress?: (e: { preventDefault: () => void }) => void | Promise<void>;
      children?: React.ReactNode;
    }) =>
      React.createElement(
        Pressable,
        {
          testID: 'external-link',
          onPress: () =>
            onPress?.({
              preventDefault: mockPreventDefault,
            }),
        },
        React.createElement(Text, null, children),
        React.createElement(Text, { testID: 'href' }, href)
      ),
  };
});

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: { AUTOMATIC: 'automatic' },
}));

describe('ExternalLink', () => {
  const originalExpoOs = process.env.EXPO_OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'opened' });
  });

  afterEach(() => {
    process.env.EXPO_OS = originalExpoOs;
  });

  test('en nativo abre in-app browser y previene el enlace por defecto', async () => {
    process.env.EXPO_OS = 'ios';
    const { getByTestId } = render(
      <ExternalLink href="https://example.com">Abrir</ExternalLink>
    );

    fireEvent.press(getByTestId('external-link'));

    await waitFor(() => {
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(openBrowserAsync).toHaveBeenCalledWith('https://example.com', {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    });
  });

});
