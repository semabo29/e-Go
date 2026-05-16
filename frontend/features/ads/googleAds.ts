import mobileAds, {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import { AD_UNIT_IDS, areAdsSupported, isAdsEnabledInBuild } from '@/constants/ads';

let initialized = false;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let rewarded: RewardedAd | null = null;
let rewardedLoaded = false;

export async function initializeGoogleAds(): Promise<void> {
  if (!areAdsSupported() || !isAdsEnabledInBuild() || initialized) return;

  await mobileAds().setRequestConfiguration({
    testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
  });
  await mobileAds().initialize();
  initialized = true;
  preloadInterstitial();
  preloadRewarded();
}

function preloadInterstitial(): void {
  if (!areAdsSupported() || !isAdsEnabledInBuild()) return;

  interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
  interstitialLoaded = false;

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    preloadInterstitial();
  });
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
    preloadInterstitial();
  });

  interstitial.load();
}

function preloadRewarded(): void {
  if (!areAdsSupported() || !isAdsEnabledInBuild()) return;

  rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
  rewardedLoaded = false;

  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
  });
  rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    preloadRewarded();
  });
  rewarded.addAdEventListener(AdEventType.ERROR, () => {
    rewardedLoaded = false;
    preloadRewarded();
  });

  rewarded.load();
}

function showRewardedAd(): Promise<void> {
  return new Promise((resolve) => {
    const ad = rewarded!;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClosed();
      rewardedLoaded = false;
      finish();
    });

    try {
      ad.show();
    } catch {
      unsubClosed();
      finish();
    }
  });
}

function showInterstitialAdInternal(): Promise<void> {
  return new Promise((resolve) => {
    const ad = interstitial!;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClosed();
      interstitialLoaded = false;
      finish();
    });

    try {
      ad.show();
    } catch {
      unsubClosed();
      finish();
    }
  });
}

/**
 * Pantalla completa: primero vídeo rewarded (lo más parecido al MP4 de 30 s);
 * si no está cargado, interstitial. La duración la marca Google (suele ser 15–30 s en vídeo).
 */
export async function showFullscreenAd(): Promise<void> {
  if (!areAdsSupported() || !isAdsEnabledInBuild()) return;

  if (rewarded && rewardedLoaded) {
    await showRewardedAd();
    return;
  }
  if (interstitial && interstitialLoaded) {
    await showInterstitialAdInternal();
  }
}

/** @deprecated Usar showFullscreenAd */
export const showInterstitialAd = showFullscreenAd;

/** Solo tests: reinicia estado del módulo entre casos. */
export function resetGoogleAdsModuleForTests(): void {
  if (process.env.NODE_ENV === 'production') return;
  initialized = false;
  interstitial = null;
  interstitialLoaded = false;
  rewarded = null;
  rewardedLoaded = false;
}
