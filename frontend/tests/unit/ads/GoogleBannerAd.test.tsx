import React from 'react';
import { render } from '@testing-library/react-native';

import { GoogleBannerAd } from '@/components/ads/GoogleBannerAd';

const mockUseSubscription = jest.fn();

jest.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => mockUseSubscription(),
}));

const mockAreAdsSupported = jest.fn(() => true);
const mockIsAdsEnabledInBuild = jest.fn(() => true);

jest.mock('@/constants/ads', () => ({
  areAdsSupported: () => mockAreAdsSupported(),
  isAdsEnabledInBuild: () => mockIsAdsEnabledInBuild(),
  AD_UNIT_IDS: { banner: 'test-banner' },
}));

describe('GoogleBannerAd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAreAdsSupported.mockReturnValue(true);
    mockIsAdsEnabledInBuild.mockReturnValue(true);
    mockUseSubscription.mockReturnValue({
      isPremium: false,
      isLoading: false,
    });
  });

  test('renderiza banner para usuario free', () => {
    const { getByTestId } = render(<GoogleBannerAd testID="banner-slot" />);
    expect(getByTestId('banner-slot')).toBeTruthy();
    expect(getByTestId('mock-banner-ad')).toBeTruthy();
  });

  test('no renderiza si el usuario es premium', () => {
    mockUseSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    const { queryByTestId } = render(<GoogleBannerAd testID="banner-slot" />);
    expect(queryByTestId('banner-slot')).toBeNull();
  });

  test('no renderiza mientras carga la suscripción', () => {
    mockUseSubscription.mockReturnValue({ isPremium: false, isLoading: true });
    const { queryByTestId } = render(<GoogleBannerAd testID="banner-slot" />);
    expect(queryByTestId('banner-slot')).toBeNull();
  });

  test('no renderiza si la plataforma no soporta anuncios', () => {
    mockAreAdsSupported.mockReturnValue(false);
    const { queryByTestId } = render(<GoogleBannerAd testID="banner-slot" />);
    expect(queryByTestId('banner-slot')).toBeNull();
  });

  test('no renderiza si los anuncios están desactivados en build', () => {
    mockIsAdsEnabledInBuild.mockReturnValue(false);
    const { queryByTestId } = render(<GoogleBannerAd testID="banner-slot" />);
    expect(queryByTestId('banner-slot')).toBeNull();
  });
});
