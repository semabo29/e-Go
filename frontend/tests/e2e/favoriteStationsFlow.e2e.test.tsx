import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import InicioScreen from '../../app/(tabs)/index';
import MyFavoriteStationsScreen from '../../app/my-favorite-stations';
import { appFetch } from '@/services/appFetch';

// ==========================================
// 1. MOCKS DE LIBRERÍAS NATIVAS BASE
// ==========================================
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    Swipeable: View, DrawerLayout: View, State: {}, ScrollView: View, Slider: View,
    Switch: View, TextInput: View, NativeViewGestureHandler: View, TapGestureHandler: View,
    FlingGestureHandler: View, ForceTouchGestureHandler: View, LongPressGestureHandler: View,
    PanGestureHandler: View, PinchGestureHandler: View, RotationGestureHandler: View,
    RawButton: View, BaseButton: View, RectButton: View, BorderlessButton: View, FlatList: View,
    gestureHandlerRootHOC: jest.fn(), Directions: {},
  };
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// 🛠️ MOCK DIRECTO DE MAPAS (Evita que se cuelgue si falla el mock por ruta relativa)
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="map-view">{children}</View>,
    Marker: ({ children, onPress }: any) => (
      <TouchableOpacity testID="map-marker" onPress={onPress}>{children}</TouchableOpacity>
    ),
  };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), navigate: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        const cleanup = cb();
        return () => { if (typeof cleanup === 'function') cleanup(); };
      }, []);
    },
    Link: ({ children }: any) => children,
  };
});

// ==========================================
// 2. MOCKS DE E-GO (MAPAS, GPS, ADS, LOGIN)
// ==========================================
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn().mockResolvedValue(true), signIn: jest.fn() },
  statusCodes: { SIGN_IN_CANCELLED: '1', IN_PROGRESS: '2', PLAY_SERVICES_NOT_AVAILABLE: '3' },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 41.3879, longitude: 2.1699 } }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
}));

jest.mock('@/features/ads/googleAds', () => ({ showFullscreenAd: jest.fn() }));
jest.mock('@/services/incidenciaApiService', () => ({ submitIncidencia: jest.fn() }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn(),
}));

jest.mock('@/services/appFetch', () => ({
  appFetch: jest.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    status: 200,
    json: async () => []
  })),
}));

// ==========================================
// 3. MOCKS DE CONTEXTOS Y UI (RUTAS RELATIVAS + ALIAS)
// ==========================================
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => <View>{children}</View>,
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
    BottomSheetModal: ({ children }: any) => <View>{children}</View>,
    BottomSheetModalProvider: ({ children }: any) => <View>{children}</View>,
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, email: 'test@ego.app', username: 'VoltDriver' }, isLoading: false }),
}));
jest.mock('@/contexts/ChargingContext', () => ({
  useCharging: () => ({ currentCharging: null }),
}));
jest.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: false }),
}));
jest.mock('@/hooks/use-screen-theme', () => ({
  useScreenTheme: () => ({
    isDark: false, containerBg: '#fff', surface: '#fff', surfaceElevated: '#fff', border: '#eee',
    title: '#000', mutedText: '#666', secondaryText: '#444', chipBg: '#ddd',
    sem: { accent: '#3b82f6', chipActiveBg: '#e0f2fe', error: '#ef4444' },
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: jest.fn() } }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

// 🛠️ MOCK DOBLE: Asegura la captura tanto por Alias como por ruta relativa real
const mockMapWrapper = {
  MapView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="map-view">{children}</View>;
  },
  Marker: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity testID="map-marker" onPress={onPress}>{children}</TouchableOpacity>;
  },
};
jest.mock('@/app/_components/MapWrapper', () => mockMapWrapper);
jest.mock('../../app/_components/MapWrapper', () => mockMapWrapper); // 👈 Corregido aquí

const mockTopBar = { __esModule: true, default: () => {
  const { View } = require('react-native');
  return <View testID="top-bar" />;
}};
jest.mock('@/components/TopBar', () => mockTopBar);
jest.mock('../../components/TopBar', () => mockTopBar);

const mockStationBottomSheet = {
  StationBottomSheet: ({ station }: any) => {
    if (!station) return null;
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="station-bottom-sheet">
        <Text>{station.nom}</Text>
        <TouchableOpacity
          testID="btn-add-favorite"
          onPress={() => {
            if ((globalThis as any).mockAddFavoriteTrigger) {
              (globalThis as any).mockAddFavoriteTrigger();
            }
          }}
        >
          <Text>favorite-border</Text>
        </TouchableOpacity>
      </View>
    );
  },
};
jest.mock('@/components/StationBottomSheet', () => mockStationBottomSheet);
jest.mock('../../components/StationBottomSheet', () => mockStationBottomSheet);

// ==========================================
// 4. DATOS DE PRUEBA Y TESTS
// ==========================================
let mockFavoritesDB: any[] = [];
const mockStation = {
  id: 99, nom: 'SuperCargador E2E', municipi: 'Barcelona', adreca: 'Calle Falsa 123',
  kw: '50', latitud: '41.3851', longitud: '2.1734', operatiu: true,
};

describe('E2E: Flujo de Favoritos (Añadir y Listar)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFavoritesDB = [];

    (appFetch as jest.Mock).mockImplementation(async (url: string) => {
      let data: any[] = [];
      const urlStr = String(url);

      if (urlStr.includes('/estacions') || urlStr.includes('/stations')) {
        data = [mockStation];
      } else if (urlStr.includes('/favorites')) {
        data = mockFavoritesDB;
      }

      return {
        ok: true,
        status: 200,
        json: async () => data,
      };
    });
  });

  test('Paso 1: El usuario abre la pantalla de Favoritos y visualiza su estación guardada', async () => {
    mockFavoritesDB.push(mockStation);

    const { getByText } = render(<MyFavoriteStationsScreen />);

    await waitFor(() => {
      expect(appFetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByText('SuperCargador E2E')).toBeTruthy();
    }, { timeout: 2000 });
  });
});