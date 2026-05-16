import { Platform } from 'react-native';

import {
  AD_UNIT_IDS,
  GOOGLE_ADMOB_TEST_APP_IDS,
  areAdsSupported,
  isAdsEnabledInBuild,
} from '@/constants/ads';

describe('constants/ads', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  test('GOOGLE_ADMOB_TEST_APP_IDS define android e ios', () => {
    expect(GOOGLE_ADMOB_TEST_APP_IDS.android).toContain('ca-app-pub-');
    expect(GOOGLE_ADMOB_TEST_APP_IDS.ios).toContain('ca-app-pub-');
  });

  test('AD_UNIT_IDS tiene banner, interstitial y rewarded', () => {
    expect(AD_UNIT_IDS.banner).toBeTruthy();
    expect(AD_UNIT_IDS.interstitial).toBeTruthy();
    expect(AD_UNIT_IDS.rewarded).toBeTruthy();
  });

  test('areAdsSupported en android e ios', () => {
    Platform.OS = 'android';
    expect(areAdsSupported()).toBe(true);
    Platform.OS = 'ios';
    expect(areAdsSupported()).toBe(true);
  });

  test('areAdsSupported false en web', () => {
    Platform.OS = 'web';
    expect(areAdsSupported()).toBe(false);
  });

  test('isAdsEnabledInBuild por defecto true', () => {
    const prev = process.env.EXPO_PUBLIC_ADS_ENABLED;
    delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    expect(isAdsEnabledInBuild()).toBe(true);
    if (prev !== undefined) process.env.EXPO_PUBLIC_ADS_ENABLED = prev;
  });

  test('isAdsEnabledInBuild false con 0 o false', () => {
    const prev = process.env.EXPO_PUBLIC_ADS_ENABLED;
    process.env.EXPO_PUBLIC_ADS_ENABLED = '0';
    expect(isAdsEnabledInBuild()).toBe(false);
    process.env.EXPO_PUBLIC_ADS_ENABLED = 'false';
    expect(isAdsEnabledInBuild()).toBe(false);
    if (prev === undefined) delete process.env.EXPO_PUBLIC_ADS_ENABLED;
    else process.env.EXPO_PUBLIC_ADS_ENABLED = prev;
  });

  test('AD_UNIT_IDS usa variables de entorno si existen', () => {
    const prevBanner = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID;
    const prevInterstitial = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID;
    const prevRewarded = process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID;

    process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID = ' custom-banner ';
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID = 'custom-interstitial';
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID = 'custom-rewarded';

    jest.resetModules();
    const { AD_UNIT_IDS: ids } = require('@/constants/ads') as typeof import('@/constants/ads');

    expect(ids.banner).toBe('custom-banner');
    expect(ids.interstitial).toBe('custom-interstitial');
    expect(ids.rewarded).toBe('custom-rewarded');

    if (prevBanner === undefined) delete process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID;
    else process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID = prevBanner;
    if (prevInterstitial === undefined) delete process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID;
    else process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID = prevInterstitial;
    if (prevRewarded === undefined) delete process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID;
    else process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID = prevRewarded;
    jest.resetModules();
  });
});
