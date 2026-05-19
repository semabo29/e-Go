import { afterEach, describe, expect, test } from '@jest/globals';
import { Platform } from 'react-native';

import { shouldUseIosTabHaptic, shouldUseNativeInAppBrowser } from '@/utils/expoPlatform';

describe('expoPlatform', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
  });

  test('shouldUseNativeInAppBrowser es false en web y true en nativo', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    expect(shouldUseNativeInAppBrowser()).toBe(false);

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    expect(shouldUseNativeInAppBrowser()).toBe(true);

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    expect(shouldUseNativeInAppBrowser()).toBe(true);
  });

  test('shouldUseIosTabHaptic solo en iOS', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    expect(shouldUseIosTabHaptic()).toBe(true);

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    expect(shouldUseIosTabHaptic()).toBe(false);

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    expect(shouldUseIosTabHaptic()).toBe(false);
  });
});
