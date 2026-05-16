import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { clearHarnessStores, getHarness, invokeHandler } from './googleAds.testHelpers';

const { mockPlatform } = vi.hoisted(() => ({
  mockPlatform: { OS: 'android' as string },
}));

vi.mock('react-native', () => ({
  Platform: mockPlatform,
}));

vi.mock('react-native-google-mobile-ads', () => {
  const mockCreateAd = (store: Record<string, Array<(...args: unknown[]) => void>>) => ({
    load: vi.fn(),
    show: vi.fn(),
    addAdEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      (store[event] ||= []).push(handler);
      return vi.fn(() => {
        store[event] = (store[event] || []).filter((h) => h !== handler);
      });
    }),
  });

  const harness = {
    interstitialStore: {} as Record<string, Array<(...args: unknown[]) => void>>,
    rewardedStore: {} as Record<string, Array<(...args: unknown[]) => void>>,
    interstitialAd: mockCreateAd({}),
    rewardedAd: mockCreateAd({}),
  };
  harness.interstitialAd = mockCreateAd(harness.interstitialStore);
  harness.rewardedAd = mockCreateAd(harness.rewardedStore);
  globalThis.__adTestHarness = harness as typeof globalThis.__adTestHarness;

  const mobileAdsInstance = {
    initialize: vi.fn(async () => {}),
    setRequestConfiguration: vi.fn(async () => {}),
  };

  return {
    default: vi.fn(() => mobileAdsInstance),
    BannerAd: () => null,
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    TestIds: {
      BANNER: 'test-banner',
      INTERSTITIAL: 'test-interstitial',
      REWARDED: 'test-rewarded',
    },
    InterstitialAd: {
      createForAdRequest: vi.fn(() => {
        harness.interstitialAd = mockCreateAd(harness.interstitialStore);
        return harness.interstitialAd;
      }),
    },
    RewardedAd: {
      createForAdRequest: vi.fn(() => {
        harness.rewardedAd = mockCreateAd(harness.rewardedStore);
        return harness.rewardedAd;
      }),
    },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'earned_reward' },
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  };
});

import mobileAds, { InterstitialAd, RewardedAd } from 'react-native-google-mobile-ads';

import {
  initializeGoogleAds,
  resetGoogleAdsModuleForTests,
  showFullscreenAd,
  showInterstitialAd,
} from './googleAds';

describe('googleAds (vitest)', () => {
  const originalAdsFlag = process.env.EXPO_PUBLIC_ADS_ENABLED;

  beforeEach(() => {
    mockPlatform.OS = 'android';
    delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    resetGoogleAdsModuleForTests();
    vi.clearAllMocks();
    clearHarnessStores();
  });

  afterEach(() => {
    mockPlatform.OS = 'android';
    if (originalAdsFlag === undefined) delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    else process.env.EXPO_PUBLIC_ADS_ENABLED = originalAdsFlag;
  });

  test('initializeGoogleAds configura SDK y precarga anuncios', async () => {
    const mobileAdsInstance = (mobileAds as unknown as ReturnType<typeof vi.fn>)();

    await initializeGoogleAds();

    const { interstitialAd, rewardedAd } = getHarness();
    expect(mobileAdsInstance.setRequestConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ testDeviceIdentifiers: expect.any(Array) })
    );
    expect(mobileAdsInstance.initialize).toHaveBeenCalledTimes(1);
    expect(interstitialAd.load).toHaveBeenCalled();
    expect(rewardedAd.load).toHaveBeenCalled();
  });

  test('initializeGoogleAds no hace nada si plataforma no soportada', async () => {
    mockPlatform.OS = 'web';
    const mobileAdsInstance = (mobileAds as unknown as ReturnType<typeof vi.fn>)();

    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).not.toHaveBeenCalled();
  });

  test('initializeGoogleAds no hace nada si anuncios desactivados', async () => {
    process.env.EXPO_PUBLIC_ADS_ENABLED = 'false';
    const mobileAdsInstance = (mobileAds as unknown as ReturnType<typeof vi.fn>)();

    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).not.toHaveBeenCalled();
  });

  test('initializeGoogleAds solo corre una vez', async () => {
    const mobileAdsInstance = (mobileAds as unknown as ReturnType<typeof vi.fn>)();

    await initializeGoogleAds();
    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).toHaveBeenCalledTimes(1);
  });

  test('preload interstitial cubre LOADED y ERROR', async () => {
    await initializeGoogleAds();
    const { interstitialAd } = getHarness();
    const createMock = InterstitialAd.createForAdRequest as ReturnType<typeof vi.fn>;

    invokeHandler(interstitialAd, 'loaded');
    const createsAfterLoaded = createMock.mock.calls.length;
    invokeHandler(interstitialAd, 'error');

    expect(createMock.mock.calls.length).toBeGreaterThan(createsAfterLoaded);
    expect(getHarness().interstitialAd.load).toHaveBeenCalled();
  });

  test('preload rewarded cubre LOADED y ERROR', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    const createMock = RewardedAd.createForAdRequest as ReturnType<typeof vi.fn>;

    invokeHandler(rewardedAd, 'rewarded_loaded');
    const createsAfterLoaded = createMock.mock.calls.length;
    invokeHandler(rewardedAd, 'error');

    expect(createMock.mock.calls.length).toBeGreaterThan(createsAfterLoaded);
    expect(getHarness().rewardedAd.load).toHaveBeenCalled();
  });

  test('showFullscreenAd muestra rewarded cuando está cargado', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    invokeHandler(rewardedAd, 'rewarded_loaded');

    const pending = showFullscreenAd();
    expect(rewardedAd.show).toHaveBeenCalled();
    invokeHandler(rewardedAd, 'closed', 'last');
    await pending;
  });

  test('showFullscreenAd usa interstitial si rewarded no está listo', async () => {
    await initializeGoogleAds();
    const { interstitialAd, rewardedAd } = getHarness();
    invokeHandler(interstitialAd, 'loaded');

    const pending = showFullscreenAd();
    expect(interstitialAd.show).toHaveBeenCalled();
    expect(rewardedAd.show).not.toHaveBeenCalled();
    invokeHandler(interstitialAd, 'closed', 'last');
    await pending;
  });

  test('preload interstitial CLOSED vuelve a precargar', async () => {
    await initializeGoogleAds();
    const { interstitialAd } = getHarness();
    const createMock = InterstitialAd.createForAdRequest as ReturnType<typeof vi.fn>;
    const createsBefore = createMock.mock.calls.length;

    invokeHandler(interstitialAd, 'closed');

    expect(createMock.mock.calls.length).toBeGreaterThan(createsBefore);
    expect(getHarness().interstitialAd.load).toHaveBeenCalled();
  });

  test('preload rewarded CLOSED vuelve a precargar', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    const createMock = RewardedAd.createForAdRequest as ReturnType<typeof vi.fn>;
    const createsBefore = createMock.mock.calls.length;

    invokeHandler(rewardedAd, 'closed');

    expect(createMock.mock.calls.length).toBeGreaterThan(createsBefore);
    expect(getHarness().rewardedAd.load).toHaveBeenCalled();
  });

  test('showFullscreenAd no hace nada si ningún anuncio está cargado', async () => {
    await initializeGoogleAds();
    const { interstitialAd, rewardedAd } = getHarness();

    await showFullscreenAd();

    expect(rewardedAd.show).not.toHaveBeenCalled();
    expect(interstitialAd.show).not.toHaveBeenCalled();
  });

  test('showFullscreenAd no hace nada si anuncios desactivados', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    invokeHandler(rewardedAd, 'rewarded_loaded');
    process.env.EXPO_PUBLIC_ADS_ENABLED = 'false';

    await showFullscreenAd();

    expect(rewardedAd.show).not.toHaveBeenCalled();
  });

  test('showFullscreenAd no hace nada si plataforma no soportada', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    invokeHandler(rewardedAd, 'rewarded_loaded');
    mockPlatform.OS = 'web';

    await showFullscreenAd();

    expect(rewardedAd.show).not.toHaveBeenCalled();
  });

  test('showFullscreenAd resuelve si show() lanza en rewarded', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    invokeHandler(rewardedAd, 'rewarded_loaded');
    rewardedAd.show.mockImplementation(() => {
      throw new Error('show failed');
    });

    await expect(showFullscreenAd()).resolves.toBeUndefined();
  });

  test('showFullscreenAd resuelve si show() lanza en interstitial', async () => {
    await initializeGoogleAds();
    const { interstitialAd } = getHarness();
    invokeHandler(interstitialAd, 'loaded');
    interstitialAd.show.mockImplementation(() => {
      throw new Error('show failed');
    });

    await expect(showFullscreenAd()).resolves.toBeUndefined();
  });

  test('showInterstitialAd es alias de showFullscreenAd', () => {
    expect(showInterstitialAd).toBe(showFullscreenAd);
  });
});
