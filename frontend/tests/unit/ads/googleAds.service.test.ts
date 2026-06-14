import { Platform } from 'react-native';
import mobileAds, { InterstitialAd, RewardedAd } from 'react-native-google-mobile-ads';

import {
  clearHarnessStores,
  getHarness,
  getMobileAdsTestInstance,
  invokeHandler,
} from '@/features/ads/googleAds.testHelpers';
import {
  initializeGoogleAds,
  resetGoogleAdsModuleForTests,
  showFullscreenAd,
  showInterstitialAd,
} from '@/features/ads/googleAds';

describe('features/ads/googleAds', () => {
  const originalPlatform = Platform.OS;
  const originalAdsFlag = process.env.EXPO_PUBLIC_ADS_ENABLED;

  beforeEach(() => {
    Platform.OS = 'android';
    delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    resetGoogleAdsModuleForTests();
    jest.clearAllMocks();
    clearHarnessStores();
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
    if (originalAdsFlag === undefined) delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    else process.env.EXPO_PUBLIC_ADS_ENABLED = originalAdsFlag;
  });

  test('initializeGoogleAds configura SDK y precarga anuncios', async () => {
    const mobileAdsInstance = getMobileAdsTestInstance(mobileAds);

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
    const mobileAdsInstance = getMobileAdsTestInstance(mobileAds);

    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).not.toHaveBeenCalled();
  });

  test('initializeGoogleAds no hace nada si anuncios desactivados', async () => {
    process.env.EXPO_PUBLIC_ADS_ENABLED = 'false';
    const mobileAdsInstance = getMobileAdsTestInstance(mobileAds);

    await initializeGoogleAds();

    expect(mobileAdsInstance.initialize).not.toHaveBeenCalled();
  });

  test('initializeGoogleAds solo corre una vez', async () => {
    const mobileAdsInstance = getMobileAdsTestInstance(mobileAds);

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

  test('getHarness lanza sin harness global', () => {
    const prev = globalThis.__adTestHarness;
    delete globalThis.__adTestHarness;
    expect(() => getHarness()).toThrow('Ad test harness no inicializado');
    globalThis.__adTestHarness = prev;
  });

  test('invokeHandler lanza si falta el evento', () => {
    const { interstitialAd } = getHarness();
    expect(() => invokeHandler(interstitialAd, 'no-such-event')).toThrow(
      'No listener for no-such-event'
    );
  });

  test('clearHarnessStores elimina listeners registrados', () => {
    const harness = getHarness();
    harness.interstitialStore.loaded = [jest.fn()];
    clearHarnessStores();
    expect(Object.keys(harness.interstitialStore)).toHaveLength(0);
  });
});
