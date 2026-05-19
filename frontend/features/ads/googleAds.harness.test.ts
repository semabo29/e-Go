import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearHarnessStores,
  getHarness,
  getMobileAdsTestInstance,
  invokeHandler,
} from './googleAds.testHelpers';

describe('googleAds.testHelpers', () => {
  beforeEach(() => {
    globalThis.__adTestHarness = {
      interstitialStore: {},
      rewardedStore: {},
      interstitialAd: {
        load: { mock: { calls: [] } },
        show: { mock: { calls: [] }, mockImplementation: vi.fn() },
        addAdEventListener: { mock: { calls: [] } },
      },
      rewardedAd: {
        load: { mock: { calls: [] } },
        show: { mock: { calls: [] }, mockImplementation: vi.fn() },
        addAdEventListener: { mock: { calls: [] } },
      },
    };
  });

  afterEach(() => {
    delete globalThis.__adTestHarness;
  });

  test('getHarness lanza si no hay harness', () => {
    delete globalThis.__adTestHarness;
    expect(() => getHarness()).toThrow('Ad test harness no inicializado');
  });

  test('clearHarnessStores vacía listeners', () => {
    const harness = getHarness();
    harness.interstitialStore.loaded = [vi.fn()];
    harness.rewardedStore.closed = [vi.fn()];
    clearHarnessStores();
    expect(harness.interstitialStore).toEqual({});
    expect(harness.rewardedStore).toEqual({});
  });

  test('invokeHandler ejecuta first y last', () => {
    const harness = getHarness();
    const first = vi.fn();
    const last = vi.fn();
    harness.interstitialAd.addAdEventListener.mock.calls = [
      ['closed', first],
      ['closed', last],
    ];

    invokeHandler(harness.interstitialAd, 'closed', 'first');
    invokeHandler(harness.interstitialAd, 'closed', 'last');
    expect(first).toHaveBeenCalled();
    expect(last).toHaveBeenCalled();
  });

  test('invokeHandler lanza si no hay listener', () => {
    const harness = getHarness();
    expect(() => invokeHandler(harness.interstitialAd, 'missing')).toThrow(
      'No listener for missing'
    );
  });

  test('getMobileAdsTestInstance invoca factory', () => {
    const instance = { initialize: { mock: { calls: [] } }, setRequestConfiguration: { mock: { calls: [] } } };
    const factory = vi.fn(() => instance);
    expect(getMobileAdsTestInstance(factory)).toBe(instance);
    expect(factory).toHaveBeenCalled();
  });
});
