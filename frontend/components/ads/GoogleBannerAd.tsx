import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { AD_UNIT_IDS, areAdsSupported, isAdsEnabledInBuild } from '@/constants/ads';
import { useSubscription } from '@/contexts/SubscriptionContext';

type GoogleBannerAdProps = {
  testID?: string;
};

export function GoogleBannerAd({ testID }: GoogleBannerAdProps) {
  const { isPremium, isLoading } = useSubscription();

  if (!areAdsSupported() || !isAdsEnabledInBuild() || isLoading || isPremium) {
    return null;
  }

  return (
    <View style={styles.wrap} testID={testID}>
      <BannerAd unitId={AD_UNIT_IDS.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
