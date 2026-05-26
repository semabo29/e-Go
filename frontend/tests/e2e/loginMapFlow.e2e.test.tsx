/**
 * E2E de flujo UI: login amb mail/contrasenya (sense Google) → navegar al mapa → verificar que el mapa es renderitza.
 *
 * Usa mocks d'infraestructura (fetch, GoogleSignin, router, mapa natiu) però
 * LoginScreen real amb tota la seva lògica de formulari i validació.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import LoginScreen from '@/app/login';
import InicioScreen from '@/app/(tabs)/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';

const es = require('@/i18n/locales/es').default;
const L = es.login;

let mockLocalParams: Record<string, unknown> = {};
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    setParams: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockLocalParams,
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getCurrentPositionAsync: () =>
    Promise.resolve({ coords: { latitude: 41.38, longitude: 2.17 } }),
  getLastKnownPositionAsync: () =>
    Promise.resolve({ coords: { latitude: 41.38, longitude: 2.17 } }),
  watchPositionAsync: () => Promise.resolve({ remove: jest.fn() }),
  Accuracy: { High: 4, BestForNavigation: 6 },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('@/app/_components/MapWrapper', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(({ children, onPress }: any, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: jest.fn(),
    }));
    return (
      <TouchableOpacity testID="map-view" onPress={onPress}>
        <View>{children}</View>
      </TouchableOpacity>
    );
  });

  const Marker = ({ onPress, testID }: any) => (
    <TouchableOpacity
      testID={testID || 'station-marker'}
      onPress={() => onPress?.({ stopPropagation: jest.fn() })}
    />
  );

  return { MapView, Marker };
});

jest.mock('@/components/StationBottomSheet', () => ({
  StationBottomSheet: () => null,
}));

jest.mock('@/components/LanguageMenuSelector', () => ({
  LanguageMenuSelector: () => null,
}));

jest.mock('@/components/ads/GoogleBannerAd', () => ({
  GoogleBannerAd: () => null,
}));

jest.mock('@/components/StationNearbyEventsCarousel', () => ({
  StationNearbyEventsCarousel: () => null,
}));

const mockStation = {
  id: 1,
  nom: 'Estació E2E Login',
  latitud: '41.3901',
  longitud: '2.1540',
  municipi: 'Barcelona',
  adreca: 'Carrer Test 1',
  kw: '50',
  ac_dc: 'DC',
  tipus_connexio: 'CCS',
  operatiu: true,
};

const mockUser = {
  id: 10,
  email: 'e2e@ego.app',
  username: 'e2eDriver',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('E2E: Login amb mail/contrasenya → mapa amb estacions (sense Google)', () => {
  let currentUser: any = null;
  const mockSetUser = jest.fn((u) => { currentUser = u; });
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseCharging = useCharging as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = null;
    mockLocalParams = {};

    mockUseAuth.mockImplementation(() => ({
      user: currentUser,
      setUser: mockSetUser,
      logout: jest.fn(),
      isLoading: false,
    }));

    mockUseCharging.mockReturnValue({
      isCharging: false,
      autoStopResult: null,
      clearAutoStopResult: jest.fn(),
    });

    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      const href = String(url);

      if (href.includes('/auth/local/login') && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        if (body.email === 'e2e@ego.app' && body.password === 'SecurePass123') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ user: mockUser }),
          } as any;
        }
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Credenciales incorrectas' }),
        } as any;
      }

      if (href.includes('/stations')) {
        return { ok: true, json: async () => [mockStation] } as any;
      }

      if (href.includes('/favorites') || href.includes('/skins/') || href.includes('/subscription/')) {
        return { ok: true, json: async () => [] } as any;
      }

      return { ok: true, json: async () => ({}) } as any;
    }) as unknown as typeof fetch;
  });

  test('mostra formulari de login local, envia credencials i redirigeix a tabs', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    expect(getByText(L.welcome)).toBeTruthy();

    fireEvent.press(getByText(L.mailPassword));

    await waitFor(() => {
      expect(getByPlaceholderText(es.common.email)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(es.common.email), 'e2e@ego.app');
    fireEvent.changeText(getByPlaceholderText(es.common.password), 'SecurePass123');

    fireEvent.press(getByText(L.signIn));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/local/login'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  test('credencials incorrectes mostra error i no redirigeix', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<LoginScreen />);

    fireEvent.press(getByText(L.mailPassword));

    await waitFor(() => {
      expect(getByPlaceholderText(es.common.email)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(es.common.email), 'wrong@ego.app');
    fireEvent.changeText(getByPlaceholderText(es.common.password), 'BadPass');

    fireEvent.press(getByText(L.signIn));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/local/login'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(await findByText('Credenciales incorrectas')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('camps buits mostra error de validació', async () => {
    const { getByText, findByText } = render(<LoginScreen />);

    fireEvent.press(getByText(L.mailPassword));

    await waitFor(() => {
      expect(getByText(L.signIn)).toBeTruthy();
    });

    fireEvent.press(getByText(L.signIn));

    expect(await findByText(L.errors.emailPasswordRequired)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('un cop logat, el mapa es renderitza amb estacions', async () => {
    currentUser = mockUser;
    mockUseAuth.mockReturnValue({
      user: currentUser,
      setUser: mockSetUser,
      logout: jest.fn(),
      isLoading: false,
    });

    const { getByTestId, getAllByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByTestId('home-map-screen')).toBeTruthy();
    });

    expect(getByTestId('map-view')).toBeTruthy();

    await waitFor(() => {
      const markers = getAllByTestId('station-marker');
      expect(markers.length).toBeGreaterThan(0);
    });
  });

  test('sense login, InicioScreen mostra la pantalla de benvinguda (no el mapa)', async () => {
    currentUser = null;
    mockUseAuth.mockReturnValue({
      user: null,
      setUser: mockSetUser,
      logout: jest.fn(),
      isLoading: false,
    });

    const { getByText, queryByTestId } = render(<InicioScreen />);

    await waitFor(() => {
      expect(getByText(es.home.welcomeTitle)).toBeTruthy();
    });
    expect(getByText(es.home.welcomeSubtitle)).toBeTruthy();

    expect(queryByTestId('home-map-screen')).toBeNull();
  });

  test('"Continuar sin Google" estableix usuari guest i redirigeix a tabs', async () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText(L.skipGoogle)).toBeTruthy();

    fireEvent.press(getByText(L.skipGoogle));

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalled();
    });

    const guestUser = mockSetUser.mock.calls[0][0];
    expect(guestUser.email).toBe('guest@ego.app');
    expect(guestUser.username).toBe('Guest User');

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
