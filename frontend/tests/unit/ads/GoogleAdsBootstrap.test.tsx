import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { GoogleAdsBootstrap } from '@/components/ads/GoogleAdsBootstrap';

const mockInitializeGoogleAds = jest.fn().mockResolvedValue(undefined);

jest.mock('@/features/ads/googleAds', () => ({
  initializeGoogleAds: (...args: unknown[]) => mockInitializeGoogleAds(...args),
}));

const mockAreAdsSupported = jest.fn(() => true);
const mockIsAdsEnabledInBuild = jest.fn(() => true);

jest.mock('@/constants/ads', () => ({
  areAdsSupported: () => mockAreAdsSupported(),
  isAdsEnabledInBuild: () => mockIsAdsEnabledInBuild(),
}));

describe('GoogleAdsBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAreAdsSupported.mockReturnValue(true);
    mockIsAdsEnabledInBuild.mockReturnValue(true);
  });

  test('inicializa AdMob al montar', async () => {
    render(<GoogleAdsBootstrap />);

    await waitFor(() => {
      expect(mockInitializeGoogleAds).toHaveBeenCalledTimes(1);
    });
  });

  test('no inicializa si la plataforma no soporta anuncios', async () => {
    mockAreAdsSupported.mockReturnValue(false);
    render(<GoogleAdsBootstrap />);

    await waitFor(() => {
      expect(mockInitializeGoogleAds).not.toHaveBeenCalled();
    });
  });

  test('no inicializa si los anuncios están desactivados', async () => {
    mockIsAdsEnabledInBuild.mockReturnValue(false);
    render(<GoogleAdsBootstrap />);

    await waitFor(() => {
      expect(mockInitializeGoogleAds).not.toHaveBeenCalled();
    });
  });

  test('registra warning si initialize falla', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockInitializeGoogleAds.mockRejectedValueOnce(new Error('sdk fail'));

    render(<GoogleAdsBootstrap />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        '[ads] No se pudo inicializar AdMob:',
        expect.any(Error)
      );
    });

    warnSpy.mockRestore();
  });
});
