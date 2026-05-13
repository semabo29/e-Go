import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
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
