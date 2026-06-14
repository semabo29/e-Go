import { useEffect } from 'react';

import { initializeGoogleAds } from '@/features/ads/googleAds';
import { areAdsSupported, isAdsEnabledInBuild } from '@/constants/ads';

/** Inicializa el SDK de AdMob una vez al arrancar la app (nativo). */
export function GoogleAdsBootstrap() {
  useEffect(() => {
    if (!areAdsSupported() || !isAdsEnabledInBuild()) return;
    initializeGoogleAds().catch((err) => {
      console.warn('[ads] No se pudo inicializar AdMob:', err);
    });
  }, []);

  return null;
}
