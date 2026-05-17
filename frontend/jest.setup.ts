import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

// Margen extra en CI y al instrumentar cobertura (login.integration tiene muchos waitFor).
jest.setTimeout(process.env.CI === 'true' ? 45_000 : 30_000);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es', regionCode: 'ES' }],
}));

import '@/i18n/i18n';

// Debe ir antes de reanimated/bottom-sheet: evita cargar worklets nativos en Jest.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');
  const BottomSheet = React.forwardRef((props: { children?: React.ReactNode }, _ref: unknown) =>
    React.createElement(View, { testID: 'mock-bottom-sheet' }, props.children)
  );
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView: ScrollView,
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Jest no aplica insets reals; exponemos SafeAreaView como View y el provider como fragmento para que los tests rendericen hijos.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children?: unknown }) =>
      React.createElement(React.Fragment, null, children),
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: null,
  };
});

jest.mock('react-native-reanimated', () => {
  const reactNative = require('react-native');
  return {
    __esModule: true,
    default: reactNative.View,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedProps: jest.fn(() => ({})),
    withTiming: jest.fn((v) => v),
    withSpring: jest.fn((v) => v),
    runOnUI: jest.fn((fn) => fn),
    runOnJS: jest.fn((fn) => fn),
    makeMutable: jest.fn(() => ({ value: 0 })),
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const reactNative = require('react-native');
  return {
    __esModule: true,
    default: reactNative.View,
    BottomSheetView: reactNative.View,
    BottomSheetScrollView: reactNative.ScrollView,
    BottomSheetModal: reactNative.View,
    BottomSheetModalProvider: reactNative.View,
    BottomSheetTextInput: reactNative.TextInput,
  };
});
// Mock global para módulos de mapas nativos en Jest (evita RNMapsAirModule errors).
jest.mock('react-native-maps-directions', () => () => null);
jest.mock('react-native-maps', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (_props: any) => React.createElement('MapView'),
    Marker: (_props: any) => React.createElement('Marker'),
    Polyline: (_props: any) => React.createElement('Polyline'),
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    configure: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
  },
}));

jest.mock('react-native-maps-directions', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockMapViewDirections() {
    return React.createElement(View, { testID: 'mock-map-directions' });
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(View, { testID: 'mock-map', ...props }),
    Marker: (props: any) => React.createElement(View, { testID: 'mock-marker', ...props }),
    Polyline: (props: any) => React.createElement(View, { testID: 'mock-polyline', ...props }),
  };
});

jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');

  const mockCreateAd = (store: Record<string, Array<(...args: unknown[]) => void>>) => ({
    load: jest.fn(),
    show: jest.fn(),
    addAdEventListener: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      (store[event] ||= []).push(handler);
      return jest.fn(() => {
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
  globalThis.__adTestHarness = harness;

  const mobileAdsInstance = {
    initialize: jest.fn(async () => {}),
    setRequestConfiguration: jest.fn(async () => {}),
  };

  return {
    __esModule: true,
    default: jest.fn(() => mobileAdsInstance),
    BannerAd: () => React.createElement(View, { testID: 'mock-banner-ad' }),
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    TestIds: {
      BANNER: 'test-banner',
      INTERSTITIAL: 'test-interstitial',
      REWARDED: 'test-rewarded',
    },
    InterstitialAd: {
      createForAdRequest: jest.fn(() => {
        harness.interstitialAd = mockCreateAd(harness.interstitialStore);
        return harness.interstitialAd;
      }),
    },
    RewardedAd: {
      createForAdRequest: jest.fn(() => {
        harness.rewardedAd = mockCreateAd(harness.rewardedStore);
        return harness.rewardedAd;
      }),
    },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'earned_reward' },
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  };
});

jest.mock('@/contexts/SubscriptionContext', () => ({
  SubscriptionProvider: ({ children }: { children?: unknown }) => children,
  useSubscription: () => ({
    subStatus: {
      status: 'inactive',
      isPremium: false,
      current_period_end: null,
      cancel_at_period_end: false,
    },
    isPremium: false,
    isLoading: false,
    refreshSubscription: jest.fn(),
  }),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: () => ({
    isCharging: false,
    session: null,
    distanceToStation: null,
    elapsedSeconds: 0,
    startChargingSession: jest.fn(),
    updateSessionId: jest.fn(),
    stopChargingSession: jest.fn(),
    cancelChargingSession: jest.fn(),
    autoStopResult: null,
    clearAutoStopResult: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: jest.fn(), Navigator: jest.fn() },
  Tabs: { Screen: jest.fn(), Navigator: jest.fn() },
}));
