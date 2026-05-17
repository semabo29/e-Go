import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** App IDs de prueba oficiales de Google AdMob (válidos en desarrollo / versión de prueba). */
export const GOOGLE_ADMOB_TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;

const bannerFromEnv = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID?.trim();
const interstitialFromEnv = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID?.trim();
const rewardedFromEnv = process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID?.trim();

/** Unidades de anuncio: por defecto TestIds de Google; sustituir en producción. */
export const AD_UNIT_IDS = {
  banner: bannerFromEnv || TestIds.BANNER,
  interstitial: interstitialFromEnv || TestIds.INTERSTITIAL,
  rewarded: rewardedFromEnv || TestIds.REWARDED,
};

export function areAdsSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function isAdsEnabledInBuild(): boolean {
  const flag = process.env.EXPO_PUBLIC_ADS_ENABLED?.trim().toLowerCase();
  if (flag === '0' || flag === 'false') return false;
  return true;
}
