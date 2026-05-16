import { Platform } from 'react-native';
import mobileAds, { InterstitialAd, RewardedAd } from 'react-native-google-mobile-ads';

import {
  initializeGoogleAds,
  resetGoogleAdsModuleForTests,
  showFullscreenAd,
  showInterstitialAd,
} from '@/features/ads/googleAds';

type ListenerStore = Record<string, Array<(...args: unknown[]) => void>>;

type AdTestHarness = {
  interstitialStore: ListenerStore;
  rewardedStore: ListenerStore;
  interstitialAd: { load: jest.Mock; show: jest.Mock; addAdEventListener: jest.Mock };
  rewardedAd: { load: jest.Mock; show: jest.Mock; addAdEventListener: jest.Mock };
};

declare global {
  // eslint-disable-next-line no-var
  var __adTestHarness: AdTestHarness | undefined;
}

function getHarness(): AdTestHarness {
  const harness = globalThis.__adTestHarness;
  if (!harness) throw new Error('Ad test harness no inicializado');
  return harness;
}

function invokeHandler(
  ad: { addAdEventListener: jest.Mock },
  event: string,
  which: 'first' | 'last' = 'first'
): void {
  const calls = ad.addAdEventListener.mock.calls.filter((entry) => entry[0] === event);
  if (!calls.length) throw new Error(`No listener for ${event}`);
  const call = which === 'last' ? calls[calls.length - 1] : calls[0];
  call[1]();
}

describe('features/ads/googleAds', () => {
  const originalPlatform = Platform.OS;
  const originalAdsFlag = process.env.EXPO_PUBLIC_ADS_ENABLED;

  beforeEach(() => {
    Platform.OS = 'android';
    delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    resetGoogleAdsModuleForTests();
    jest.clearAllMocks();
    for (const key of Object.keys(getHarness().interstitialStore)) {
      delete getHarness().interstitialStore[key];
    }
    for (const key of Object.keys(getHarness().rewardedStore)) {
      delete getHarness().rewardedStore[key];
    }
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
    if (originalAdsFlag === undefined) delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    else process.env.EXPO_PUBLIC_ADS_ENABLED = originalAdsFlag;
  });

  test('initializeGoogleAds configura SDK y precarga anuncios', async () => {
    const mobileAdsInstance = (mobileAds as unknown as jest.Mock)();

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
    Platform.OS = 'web';
    const mobileAdsInstance = (mobileAds as unknown as jest.Mock)();

    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).not.toHaveBeenCalled();
  });

  test('initializeGoogleAds no hace nada si anuncios desactivados', async () => {
    process.env.EXPO_PUBLIC_ADS_ENABLED = 'false';
    const mobileAdsInstance = (mobileAds as unknown as jest.Mock)();

    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).not.toHaveBeenCalled();
  });

  test('initializeGoogleAds solo corre una vez', async () => {
    const mobileAdsInstance = (mobileAds as unknown as jest.Mock)();

    await initializeGoogleAds();
    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).toHaveBeenCalledTimes(1);
  });

  test('preload interstitial cubre LOADED y ERROR', async () => {
    await initializeGoogleAds();
    const { interstitialAd } = getHarness();
    const createMock = InterstitialAd.createForAdRequest as jest.Mock;

    invokeHandler(interstitialAd, 'loaded');
    const createsAfterLoaded = createMock.mock.calls.length;
    invokeHandler(interstitialAd, 'error');

    expect(createMock.mock.calls.length).toBeGreaterThan(createsAfterLoaded);
    expect(getHarness().interstitialAd.load).toHaveBeenCalled();
  });

  test('preload rewarded cubre LOADED y ERROR', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    const createMock = RewardedAd.createForAdRequest as jest.Mock;

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
    const createMock = InterstitialAd.createForAdRequest as jest.Mock;
    const createsBefore = createMock.mock.calls.length;

    invokeHandler(interstitialAd, 'closed');

    expect(createMock.mock.calls.length).toBeGreaterThan(createsBefore);
    expect(getHarness().interstitialAd.load).toHaveBeenCalled();
  });

  test('preload rewarded CLOSED vuelve a precargar', async () => {
    await initializeGoogleAds();
    const { rewardedAd } = getHarness();
    const createMock = RewardedAd.createForAdRequest as jest.Mock;
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
    Platform.OS = 'web';

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
