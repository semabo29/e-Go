import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

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
