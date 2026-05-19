// Inicio (primera pestaña). Sin sesión: bienvenida + Google. Con sesión: menú 3 barras + PANTALLA PRINCIPAL.
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { MapView, Marker } from '../_components/MapWrapper';
import TopBar, { MapSearchListItem } from '../../components/TopBar';

import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Href, useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';


import { useAuth } from '@/contexts/AuthContext';
import { useCharging } from '@/contexts/ChargingContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { showFullscreenAd } from '@/features/ads/googleAds';
import { getApiUrl, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import {
  buildIncidenciaFormData,
  submitIncidencia,
  submitSolvedIncidencia,
} from '@/services/incidenciaApiService';
import { appFetch } from '@/services/appFetch';
import { ChargingTimerDisplay } from '../../components/ChargingTimerDisplay';
import { ChargingActionCard } from '../../components/ChargingActionCard';
import { ChargingResultModal } from '../../components/ChargingResultModal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useThemePreference } from '@/contexts/ThemePreferenceContext';
import { getSemanticColors } from '@/constants/accessibilityColors';
import type { SemanticColors } from '@/constants/accessibilityColors';
import { LanguageMenuSelector } from '@/components/LanguageMenuSelector';
import {
  requestLocationPermissions,
  isLocationServiceEnabled,
  getCurrentLocation,
  calculateDistanceInMeters
} from '@/services/chargingLocationService';
import { startChargingSession as apiStartCharging } from '@/services/chargingApiService';
import { getSkinImage } from '@/utils/skinsMapping';
//Importamos el mapa de direcciones
import MapViewDirections from 'react-native-maps-directions';
import { Polyline } from 'react-native-maps';
import {StationBottomSheet} from "@/components/StationBottomSheet"; //Para pintar el trazado de la ruta
import {
  buildClearEventLocationPatch,
  buildEventFocusMapPatch,
  getFitCoordinatesForEventFocus,
  resolveNavigationOrigin,
} from '@/utils/eventMapFocus';
import { useTranslation } from 'react-i18next';
import SvgComponent from '../_assets/logo.jsx'

let ImagePickerModule: typeof import('expo-image-picker') | null = null;
try {
  ImagePickerModule = require('expo-image-picker');
} catch (error) {
  if (__DEV__) {
    console.warn('expo-image-picker unavailable:', error);
  }
  ImagePickerModule = null;
}

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

interface Estacion {
  id: number;
  nom: string;
  latitud: string;
  longitud: string;
  municipi: string;
  adreca: string;
  kw: string;
  promotor?: string;
  acces?: string;
  tipus_velocitat?: string;
  tipus_connexio?: string;
  ac_dc?: string;
  operatiu?: boolean;
}

type ChargingResultPayload = {
  durationMinutes: number;
  basePoints: number;
  totalPoints: number;
  multiplier: number;
  isPremium: boolean;
  sessionId: number;
  reason: string;
};

export default function InicioScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { preference, setPreference } = useThemePreference();
  const { colorblindFriendly, setColorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createStyles(isDark, sem), [isDark, colorblindFriendly]);
  const router = useRouter();
  //Llegim els paràmetres de la URL
  const params = useLocalSearchParams();
  const minKw = params.minKw as string | undefined;
  const maxKw = params.maxKw as string | undefined;
  const showFavoritesFilter = params.showFavorites === 'true'; //Leemos si el filtro de favoritos esta activo
  const connectorType = params.connectorType as string | undefined;
  const ac_dc = params.ac_dc as string | undefined;
  const autoSelectStationId = params.autoSelectStationId as string | undefined;
  const [pendingAutoStart, setPendingAutoStart] = useState(false);
  const [activeSkinAsset, setActiveSkinAsset] = useState<string>('cotxe_basic');
  const [trackMarker, setTrackMarker] = useState(true);
  useEffect(() => {
    if (activeSkinAsset) {
      setTrackMarker(true);
    }
  }, [activeSkinAsset]);
  const { user, setUser, logout, isLoading: authLoading } = useAuth();
  const { isPremium: accountIsPremium } = useSubscription();
  const {
    isCharging,
    session,
    distanceToStation,
    elapsedSeconds,
    startChargingSession,
    updateSessionId,
    stopChargingSession,
    cancelChargingSession,
    autoStopResult,
    clearAutoStopResult
  } = useCharging();

  // Estados para resultado de carga
  const [showResultModal, setShowResultModal] = useState(false);
  const [chargingResult, setChargingResult] = useState<{
    durationMinutes: number;
    basePoints: number;
    totalPoints: number;
    multiplier: number;
    isPremium: boolean;
    sessionId: number;
    reason: string;
  } | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [chargingError, setChargingError] = useState('');

  const presentChargingResult = useCallback(
    async (payload: ChargingResultPayload) => {
      const skipAds = accountIsPremium || payload.isPremium;
      if (!skipAds) {
        await showFullscreenAd();
      }
      setChargingResult(payload);
      setShowResultModal(true);
    },
    [accountIsPremium]
  );

  /** Anuncio a pantalla completa antes de activar la ruta (usuarios free). */
  const activateNavigation = useCallback(
    async (start: () => void) => {
      if (!accountIsPremium) {
        await showFullscreenAd();
      }
      start();
    },
    [accountIsPremium]
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loadingEstaciones, setLoadingEstaciones] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Estacion | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [showIncidenciaForm, setShowIncidenciaForm] = useState(false);
  const [incidenciaComentario, setIncidenciaComentario] = useState('');
  const [incidenciaTipo, setIncidenciaTipo] = useState('');
  const [incidenciaArchivo, setIncidenciaArchivo] = useState<{
    uri: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [incidenciaSubmitting, setIncidenciaSubmitting] = useState(false);

  // --- NOUS ESTATS PEL BUSCADOR ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchListItem[]>([]);
  const [searchMode, setSearchMode] = useState<'stations' | 'addresses'>('stations');
  const [isSearching, setIsSearching] = useState(false);

  // Estado para controlar la región visible del mapa
  const [region] = useState({
    latitude: 41.3879,
    longitude: 2.16992,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const mapRef = useRef<any>(null);
  
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const [authStep, setAuthStep] = useState<'google' | 'username'>('google');
  const [pendingAuth, setPendingAuth] = useState<{ pending_token: string } | null>(null);
  const [welcomeUsername, setWelcomeUsername] = useState('');
  const [welcomeEmail, setWelcomeEmail] = useState('');
  const [welcomePassword, setWelcomePassword] = useState('');
  const [authLoadingGoogle, setAuthLoadingGoogle] = useState(false);
  const [authError, setAuthError] = useState('');
  const INCIDENCIA_TYPE_KEYS = ['Avariat', 'Inexistent', 'DadesIncorrectes', 'Altres'] as const;

  //Estados para la navegacion a un punto
  const [isNavigating, setIsNavigating] = useState(false);
  const [isDrivingMode, setIsDrivingMode] = useState(false);
  // Referencia para guardar la suscripción al GPS y poder apagarla
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  //NAVEGACIÓN 3D (Waze / Google Maps)
  useEffect(() => {
    let isMounted = true;

    const start3DTracking = async () => {
      if (isDrivingMode) { 
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 2,
          },
          (location) => {
            if (!isMounted) return;
            const { latitude, longitude, heading } = location.coords;

            if (mapRef.current && typeof mapRef.current.animateCamera === 'function') {
              mapRef.current.animateCamera(
                {
                  center: { latitude, longitude },
                  heading: heading || 0,
                  pitch: 60, 
                  zoom: 18,
                },
                { duration: 1000 }
              );
            }
          }
        );
      } else {
        // Si no estamos en modo conducción, nos aseguramos de apagar el GPS
        if (locationSubscription.current) {
          locationSubscription.current.remove();
          locationSubscription.current = null;
        }
      }
    };

    start3DTracking();

    return () => {
      isMounted = false;
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, [isDrivingMode]);
  const [routeOrigin, setRouteOrigin] = useState<{latitude: number, longitude: number} | null>(null);
  const [routeDestination, setRouteDestination] = useState<{latitude: number, longitude: number} | null>(null);
  const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number} | null>(null);
  //Estado para saber el punto  marcado por el usuario (lo uso para cunado un conductor quiere ir a un sitio que no es un punto de carga y lo selecciona en el mapa)
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number} | null>(null);
  /** Si ve d’un event: ruta “Cómo llegar” amb origen a l’estació (no demanar GPS). */
  const [routeOriginPreset, setRouteOriginPreset] = useState<{latitude: number; longitude: number} | null>(null);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<string | null>(null);
  //Estado para saber las coordenadas que ocupan la ruta
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  //Estado para saber si estamos seleccionando nosotros mismos el origen de la ruta
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);

  const handleFocusEventOnMap = useCallback(
    (
      eventLat: number,
      eventLon: number,
      title: string,
      originLat: number,
      originLon: number
    ) => {
      const patch = buildEventFocusMapPatch(eventLat, eventLon, title, originLat, originLon);
      setRouteOriginPreset(patch.routeOriginPreset);
      setSelectedLocation(patch.selectedLocation);
      setSelectedLocationLabel(patch.selectedLocationLabel);
      setSelectedStation(null);
      setIsNavigating(false);
      setRouteCoords([]);
      setRouteDestination(null);
      setRouteInfo(null);
      requestAnimationFrame(() => {
        if (mapRef.current && typeof mapRef.current.fitToCoordinates === 'function') {
          mapRef.current.fitToCoordinates(
            getFitCoordinatesForEventFocus(originLat, originLon, eventLat, eventLon),
            { edgePadding: { top: 100, right: 50, bottom: 280, left: 50 }, animated: true }
          );
        }
      });
    },
    []
  );

  //Funcion para empezar la navegacion
  const handleStartNavigation = (coordenadas: {latitude: number, longitude: number}) => {
      setRouteCoords([]);
      setRouteInfo(null);
      setRouteDestination(coordenadas);
      const originResolution = resolveNavigationOrigin(routeOriginPreset);
      if (originResolution.type === 'preset') {
        setRouteOrigin(originResolution.origin);
        setRouteOriginPreset(null);
        setSelectedLocationLabel(null);
        setIsNavigating(true);
        return;
      }
      //Preguntamos al usuario el origen
      Alert.alert(
        t('navigation.startRouteTitle'),
        t('navigation.startRouteBody'),
        [
          {
            text: t('navigation.myLocation'),
            onPress: () => {
              if (userLocation && userLocation.coords) {
                void activateNavigation(() => {
                  setRouteOrigin({
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                  });
                  setIsNavigating(true);
                });
              } else {
                Alert.alert(t('navigation.gpsOffTitle'), t('navigation.gpsOffBody'));
              }
            },
          },
          {
            text: t('navigation.searchOtherOrigin'),
            onPress: () => {
              setIsSelectingOrigin(true); //Activamos el modo selección de punto de origen
              //Alert.alert("Modo búsqueda", "Busca un lugar en la barra superior para usarlo como origen.");
            }
          },
          { text: t('common.cancel'), style: "cancel" }
        ]
      );
  };
  // Función para manejar el inicio de una sesión de carga
  const handleStartCharging = async (): Promise<boolean> => {
    if (!user || !selectedStation || !userLocation) {
      setChargingError(t('charging.missingData'));
      return false;
    }

    try {
      // Verificar permisos de ubicación
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        setChargingError(t('charging.needLocationPermission'));
        return false;
      }

      // Verificar que los servicios de ubicación estén habilitados
      const isEnabled = await isLocationServiceEnabled();
      if (!isEnabled) {
        setChargingError(t('charging.enableLocationServices'));
        return false;
      }

      // Obtener ubicación actual
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        setChargingError(t('charging.couldNotGetLocation'));
        return false;
      }

      // VERIFICACIÓ DE DISTÀNCIA AMB POP-UP
      const distance = calculateDistanceInMeters(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        parseFloat(selectedStation.latitud),
        parseFloat(selectedStation.longitud)
      );

      if (distance > 30) {
        Alert.alert(
          t('charging.tooFarTitle'),
          t('charging.tooFarBody', { distance }),
          [{ text: t('common.understood'), style: 'default' }]
        );
        return false; // Aturem l'execució aquí mateix
      }

      // Iniciar sesión en el contexto
      const success = await startChargingSession(
        selectedStation.id,
        parseFloat(selectedStation.latitud),
        parseFloat(selectedStation.longitud),
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

      if (success) {
        // Crear sesión en el backend
        const apiResponse = await apiStartCharging(
          user.id,
          selectedStation.id,
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );

        // Guardar el ID de la sesión en el contexto
        if (apiResponse.session?.id) {
          // Actualizar sesión con ID del backend
          updateSessionId(apiResponse.session.id);
        }
      }

      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('charging.startError');
      setChargingError(message);
      console.error('Error iniciando carga:', error);
      return false;
    }
  };

  // Escoltar si el context tanca la sessió automàticament (ex: distància superada)
    useEffect(() => {
      if (autoStopResult) {
        const points = autoStopResult.apiResponse?.pointsGained || { basePoints: 0, totalPoints: 0, multiplier: 1 };

        void presentChargingResult({
          durationMinutes: autoStopResult.durationMinutes,
          basePoints: points.basePoints,
          totalPoints: points.totalPoints,
          multiplier: points.multiplier,
          isPremium: autoStopResult.apiResponse?.isPremium || false,
          sessionId: autoStopResult.session?.id || 0,
          reason: autoStopResult.reason,
        });

        clearAutoStopResult(); // Ho netegem perquè no es torni a obrir sol
      }
    }, [autoStopResult, presentChargingResult, clearAutoStopResult]);

  // Función para finalizar la carga
    const handleFinishCharging = async () => {
      if (!user || !session) return;

      setResultLoading(true);
      try {
        // Cridem al context i ell ja s'encarrega de parlar amb el backend
        const result = await stopChargingSession('manual');

        if (result && result.apiResponse) {
          // Agafem els punts reals que ens retorna el backend
          const points = result.apiResponse.pointsGained;

          await presentChargingResult({
            durationMinutes: result.durationMinutes,
            basePoints: points.basePoints,
            totalPoints: points.totalPoints,
            multiplier: points.multiplier,
            isPremium: result.apiResponse.isPremium,
            sessionId: result.session?.id || 0,
            reason: result.reason,
          });
        }
      } catch (error) {
        console.error('Error al finalizar:', error);
        Alert.alert(t('common.error'), t('charging.finishSessionError'));
      } finally {
        setResultLoading(false);
      }
    };

  // Función para cancelar la carga
  const handleCancelCharging = () => {
    Alert.alert(
      t('charging.cancelTitle'),
      t('charging.cancelBody'),
      [
        { text: t('charging.cancelContinue'), style: 'cancel' },
        {
          text: t('charging.cancelSession'),
          style: 'destructive',
          onPress: () => {
            cancelChargingSession();
            setChargingError('');
          },
        },
      ]
    );
  };

  const handleResultModalConfirm = () => {
    setShowResultModal(false);
    setChargingResult(null);
    setSelectedStation(null);
  };

  // Cargar estaciones de la base de datos
  useEffect(() => {
    if (user) {
      fetchUserFavorites();
      fetchEstaciones();
    }
  }, [user, minKw, maxKw, connectorType, ac_dc]);

  // Pedir permiso y obtener ubicación del usuario (Seguro para Web y Móvil)
  useEffect(() => {
    if (!user) return;
    
    // Variable para guardar el "escuchador" del GPS
    let locationSubscriber: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('charging.locationPermissionTitle'),
          t('charging.locationPermissionBody')
        );
        return;
      }

      try {
        // 1. Obtenemos la posición inicial rápida para centrar el mapa
        const initialLocation = await Location.getCurrentPositionAsync({});
        setUserLocation(initialLocation);

        if (initialLocation && mapRef.current) {
          if (typeof mapRef.current.animateToRegion === 'function') {
            mapRef.current.animateToRegion(
              { ...initialLocation.coords, latitudeDelta: 0.05, longitudeDelta: 0.05 },
              1000
            );
          }
        }
      } catch (error) {
        console.warn("No se pudo obtener la ubicación inicial por GPS apagado o sin señal:", error);
        // Si falla, no pasa nada, la app no crashea y el watchPositionAsync de abajo lo seguirá intentando.
      }

      try {
        locationSubscriber = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.High, 
            timeInterval: 2000, // Actualiza cada 2 segundos
            distanceInterval: 2 // Actualiza si te mueves 2 metros
          },
          (newLocation) => {
            setUserLocation(newLocation);
          }
        );
      } catch (error) {
        console.warn("Error al intentar suscribirse al GPS:", error);
      }
    })();

    // 3. Limpiamos la suscripción si el componente se desmonta (ahorra batería)
    return () => {
      if (locationSubscriber) {
        locationSubscriber.remove();
      }
    };
  }, [user]);

// --- AUTO-SELECCIONAR ESTACIÓ I PREPARAR CÀRREGA ---
  useEffect(() => {
    if (autoSelectStationId && estaciones.length > 0) {
      const stationToSelect = estaciones.find(est => est.id.toString() === autoSelectStationId);

      if (stationToSelect) {
        // Obrim el panell inferior assignant-la
        setSelectedStation(stationToSelect);

        // Centrem la càmera del mapa a sobre de l'estació
        if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
          mapRef.current.animateToRegion({
            latitude: parseFloat(stationToSelect.latitud),
            longitude: parseFloat(stationToSelect.longitud),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }

        // Activem l'avís d'inici automàtic
        setPendingAutoStart(true);

        // Esborrem el paràmetre de la URL
        router.setParams({ autoSelectStationId: '' });
      }
    }
  }, [autoSelectStationId, estaciones]);

  // --- INICIAR LA CÀRREGA AUTOMÀTICAMENT QUAN TOT ESTIGUI LLEST ---
  useEffect(() => {
    // Si tenim la instrucció d'iniciar, el panell està obert, i tenim GPS...
    if (pendingAutoStart && selectedStation && userLocation && !isCharging) {

      // Apaguem l'avís immediatament perquè només s'executi un cop
      setPendingAutoStart(false);

      // Executem la funció d'iniciar càrrega (la mateixa que fa anar el botó)
      handleStartCharging();
    }
  }, [pendingAutoStart, selectedStation, userLocation, isCharging]);

  const fetchEstaciones = async (): Promise<Estacion[]> => {
    setLoadingEstaciones(true);
    try {
      let queryParams = [];

      if (minKw) queryParams.push(`minKw=${minKw}`);
      if (maxKw) queryParams.push(`maxKw=${maxKw}`);
      if (connectorType) queryParams.push(`connectorType=${encodeURIComponent(connectorType)}`);
      if (ac_dc) queryParams.push(`ac_dc=${ac_dc}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const response = await appFetch(`/stations${queryString}`);
      const data = await response.json();

      const stations = Array.isArray(data) ? data : [];
      setEstaciones(stations);
      return stations;
    } catch (error) {
      console.error('Error cargando estaciones:', error);
      setEstaciones([]); // Si falla la red, vaciamos para evitar errores de .map()
      return [];
    } finally {
        setLoadingEstaciones(false);

    }
  };

  const refreshStationsAfterIncidencia = async (stationId: number) => {
    const stations = await fetchEstaciones();
    const updated = stations.find((e) => e.id === stationId);
    if (updated) {
      setSelectedStation(updated);
    }
  };
  const [markerRefreshKey, setMarkerRefreshKey] = useState(Date.now());

  // --- CARGA DE LA SKIN DEL USUARIO ---
  const fetchEquippedSkin = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await appFetch(`/skins/conductor/${user.id}`, {
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate', 
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await res.json();
      

      if (!res.ok) {
         console.warn('Error del servidor:', data);
         setActiveSkinAsset('cotxe_basic');
         return;
      }

      const miInventario = Array.isArray(data) ? data : (data.inventari || data.skins || []);
      
      const equippedSkins = miInventario.filter((item: any) => 
        item.equipada === true || item.equipada === 'true' || item.equipada === 1 || item.equipada === '1'
      );
      
      const equippedSkin = equippedSkins.length > 0 ? equippedSkins[equippedSkins.length - 1] : null;
      const newSkin = equippedSkin?.arxiu_asset ? equippedSkin.arxiu_asset : 'cotxe_basic';
      
      setActiveSkinAsset((prev) => {
        if (prev !== newSkin) {
          setTrackMarker(true);
          setMarkerRefreshKey(Date.now());
          return newSkin;
        }
        return prev;
      });

    } catch (e) {
      setActiveSkinAsset('cotxe_basic');
    }
  }, [user?.id]);
  
  // 1. Declaramos el callback de forma totalmente incondicional al inicio
  const handleFocusSkinFetch = useCallback(() => {
    fetchEquippedSkin();
  }, [fetchEquippedSkin]);

  // 2. Leemos expo-router de manera segura para contingencias de testing
  const expoRouterObj = require('expo-router');
  const safeFocusEffect = expoRouterObj && typeof expoRouterObj.useFocusEffect === 'function' 
    ? expoRouterObj.useFocusEffect 
    : null;

  // 3. Si existe safeFocusEffect (producción), lo llamamos pasando la función pura
  if (safeFocusEffect) {
    safeFocusEffect(handleFocusSkinFetch);
  }

  // 4. Declaramos el useEffect de contingencia de forma totalmente incondicional.
  // Internamente decidirá si se ejecuta dependiendo de si safeFocusEffect está activo o no.
  useEffect(() => {
    if (!safeFocusEffect) {
      fetchEquippedSkin();
    }
  }, [fetchEquippedSkin, safeFocusEffect]);

const fetchUserFavorites = async () => {
  if (!user?.id) return;
  try {
    const response = await appFetch(`/favorites?usuari_id=${user.id}`);
    const data = await response.json();

    // Verificamos si data existe y es un array antes de hacer el map
    let ids = [];
    if (Array.isArray(data)) {
      ids = data.map((fav: any) => fav.id);
    } else if (data && Array.isArray(data.favorites)) {
      // Por si el backend lo devuelve dentro de una propiedad 'favorites'
      ids = data.favorites.map((fav: any) => fav.id);
    } else {
      console.warn("El backend no devolvió un array de favoritos:", data);
    }
    setFavoriteIds(ids);
  } catch (error) {
    console.error("Error cargando favoritos:", error);
  }
};

// Ejecutarlo cuando el componente carga o cuando el usuario cambia
useEffect(() => {
  fetchUserFavorites();
}, [user]);



  const centerMapOnUser = () => {
    if (userLocation && mapRef.current) {
      // Comprobación de seguridad multiplataforma
      if (typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    }
  };

  const runMapSearch = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        if (searchMode === 'addresses') {
          const response = await fetch(
            `${getApiUrl()}/geocode/autocomplete?input=${encodeURIComponent(query)}`
          );
          const data = await response.json();
          if (!response.ok) {
            setSearchResults([]);
            return;
          }
          const rows = Array.isArray(data) ? data : [];
          setSearchResults(
            rows
              .map((r: { placeId?: string; place_id?: string; label: string; subtitle?: string }) => ({
                kind: 'address' as const,
                placeId: (r.placeId || r.place_id || '').trim(),
                label: r.label || '',
                subtitle: r.subtitle || '',
              }))
              .filter((row) => row.placeId.length > 0)
          );
          return;
        }

        const queryParams = [`q=${encodeURIComponent(query)}`];
        if (minKw) queryParams.push(`minKw=${minKw}`);
        if (maxKw) queryParams.push(`maxKw=${maxKw}`);
        if (connectorType) queryParams.push(`connectorType=${encodeURIComponent(connectorType)}`);
        if (ac_dc) queryParams.push(`ac_dc=${ac_dc}`);

        const queryString = queryParams.join('&');
        const response = await appFetch(`/stations/search?${queryString}`);
        const data = await response.json();

        let resultatsFinals = Array.isArray(data) ? data : [];
        if (showFavoritesFilter) {
          resultatsFinals = resultatsFinals.filter((est: Estacion) => favoriteIds.includes(est.id));
        }
        setSearchResults(
          resultatsFinals.map((est: Estacion) => ({ kind: 'station' as const, station: est }))
        );
      } catch (error) {
        console.error('Error cercant estacions:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchMode, minKw, maxKw, connectorType, ac_dc, showFavoritesFilter, favoriteIds]
  );

  // Cerca mentre s'escriu (debounce 400 ms, mínim 3 caràcters)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      void runMapSearch(searchQuery);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, runMapSearch]);

  const handleSubmitMapSearch = useCallback(() => {
    void runMapSearch(searchQuery);
  }, [runMapSearch, searchQuery]);


  const toggleSearchMode = () => {
    setSearchMode((m) => (m === 'stations' ? 'addresses' : 'stations'));
    setSearchQuery('');
    setSearchResults([]);
  };

  // Funció que s'executa quan toquem un resultat del desplegable
  const handleSelectSearchResult = async (item: MapSearchListItem) => {
    if (item.kind === 'station') {
      const station = item.station as Estacion;
      setSearchQuery('');
      setSearchResults([]);

      if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion(
          {
            latitude: parseFloat(station.latitud),
            longitude: parseFloat(station.longitud),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      }

      setSelectedStation(station);
      return;
    }

    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/geocode/place?placeId=${encodeURIComponent(item.placeId)}`
      );
      const data = await response.json();
      if (!response.ok || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
        console.warn('geocode/place:', data);
        return;
      }
      setSelectedStation(null);
      if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion(
          {
            latitude: data.lat,
            longitude: data.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          1000
        );
      }
    } catch (e) {
      console.error('Error resolviendo dirección:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // --- LÒGICA PEL TEXT DELS FILTRES ---
  let powerText = '';
  if (minKw && maxKw) {
    powerText = t('home.filters.powerBetween', { min: minKw, max: maxKw });
  } else if (minKw) {
    powerText = t('home.filters.powerMin', { min: minKw });
  } else if (maxKw) {
    powerText = t('home.filters.powerMax', { max: maxKw });
  }

  const hasFilters = !!minKw || !!maxKw || !!connectorType || !!ac_dc || !!showFavoritesFilter;
  async function handleNativeLoginFromWelcome() {
    setAuthLoadingGoogle(true);
    setAuthError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any).data?.idToken ?? (userInfo as any).idToken;

      if (!idToken) {
        setAuthError(t('login.errors.googleToken'));
        return;
      }

      let res: Response;
      try {
        res = await appFetch('/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        const base = getApiUrl();
        console.error('[Inicio] fetch /auth/google:', fetchErr, '→ URL:', `${base}/auth/google`);
        if (msg.includes('Network request failed')) {
          setAuthError(
            __DEV__
              ? t('login.errors.networkDev', { url: base })
              : t('login.errors.networkProd')
          );
        } else {
          setAuthError(t('login.errors.server'));
        }
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (data?.code !== 'USER_BANNED') {
          setAuthError(data.error || t('login.errors.loginFailed'));
        }
        return;
      }

      if (data.user) {
        setUser({
          ...data.user,
          token: data.token // Assumint que el teu backend envia el token a "data.token"
        });
        setAuthStep('google');
        setPendingAuth(null);
        setWelcomeUsername('');
        return;
      }

      if (data.needsUsername && data.pending_token) {
        setPendingAuth({ pending_token: data.pending_token });
        setAuthStep('username');
      }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        setAuthStep('google');
        setPendingAuth(null);
        setWelcomeUsername('');
        setAuthError('');
      } else if (code === statusCodes.IN_PROGRESS) {
        setAuthError(t('login.errors.inProgress'));
      } else {
        setAuthError(t('login.errors.googleConnect'));
        console.error('[Google Native Error]', err);
      }
    } finally {
      setAuthLoadingGoogle(false);
    }
  }

  async function registerWithUsernameFromWelcome() {
    if (!pendingAuth || !welcomeUsername.trim()) return;
    setAuthLoadingGoogle(true);
    setAuthError('');
    try {
      const res = await appFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_token: pendingAuth.pending_token,
          username: welcomeUsername.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setAuthStep('google');
        setPendingAuth(null);
        setWelcomeUsername('');
      } else {
        if (data?.code !== 'USER_BANNED') {
          setAuthError(data.error || t('login.errors.registerFailed'));
        }
      }
    } catch (_e) {
      setAuthError(t('login.errors.server'));
    } finally {
      setAuthLoadingGoogle(false);
    }
  }

  async function submitLocalWelcomeAuth() {
    if (!welcomeEmail.trim() || !welcomePassword.trim()) {
      setAuthError(t('login.errors.emailPasswordRequired'));
      return;
    }

    setAuthLoadingGoogle(true);
    setAuthError('');
    try {
      const res = await appFetch('/auth/local/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: welcomeEmail.trim(),
          password: welcomePassword,
        }),
      });
      const data = await res.json()
      if (!res.ok) {
        if (data?.code !== 'USER_BANNED') {
          setAuthError(data.error || t('login.errors.localLoginFailed'));
        }
        return;
      }
      if (data.user) {
        setUser({
          ...data.user,
          token: data.token // Assumint que el teu backend envia el token a "data.token"
        });
      }
    } catch (_e) {
      setAuthError(t('login.errors.server'));
    } finally {
      setAuthLoadingGoogle(false);
    }
  }

  function resetWelcomeAuthToGoogle() {
    setAuthStep('google');
    setPendingAuth(null);
    setWelcomeUsername('');
    setAuthError('');
  }

  const resetIncidenciaForm = () => {
    setIncidenciaComentario('');
    setIncidenciaTipo('');
    setIncidenciaArchivo(null);
  };

  const handleOpenIncidenciaForm = () => {
    resetIncidenciaForm();
    setShowIncidenciaForm(true);
  };

  const handleCloseIncidenciaForm = () => {
    setShowIncidenciaForm(false);
    resetIncidenciaForm();
  };

  const handleIncidenciaSubmit = async () => {
    if (!user || !selectedStation) return;

    if (!incidenciaComentario.trim() || !incidenciaTipo.trim()) {
      Alert.alert(t('incident.requiredTitle'), t('incident.requiredBody'));
      return;
    }

    const stationId = selectedStation.id;
    setIncidenciaSubmitting(true);
    try {
      const formData = buildIncidenciaFormData({
        conductor: user.id,
        estacio: stationId,
        comentari: incidenciaComentario.trim(),
        tipus: incidenciaTipo,
      });

      if (incidenciaArchivo) {
        formData.append('arxiu', {
          uri: incidenciaArchivo.uri,
          name: incidenciaArchivo.name,
          type: incidenciaArchivo.mimeType,
        } as any);
      }

      const result = await submitIncidencia(formData);
      if (!result.ok && result.conflict) {
        Alert.alert(t('incident.alreadyReportedTitle'), t('incident.alreadyReported'));
        return;
      }
      if (!result.ok) {
        throw new Error(result.error || t('incident.registerError'));
      }

      await refreshStationsAfterIncidencia(stationId);
      Alert.alert(t('incident.sentTitle'), t('incident.sentBody'));
      handleCloseIncidenciaForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('incident.sendError');
      Alert.alert(t('common.error'), message);
    } finally {
      setIncidenciaSubmitting(false);
    }
  };

  const handleSolvedIncidenciaSubmit = async () => {
    if (!user || !selectedStation) return;

    const stationId = selectedStation.id;
    try {
      const result = await submitSolvedIncidencia(user.id, stationId);
      if (!result.ok && result.conflict) {
        Alert.alert(t('incident.alreadyReportedTitle'), t('incident.alreadyReported'));
        return;
      }
      if (!result.ok) {
        throw new Error(result.error || t('incident.solvedRegisterError'));
      }

      await refreshStationsAfterIncidencia(stationId);
      Alert.alert(t('incident.reportedTitle'), t('incident.reportedBody'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('incident.solvedReportError');
      Alert.alert(t('common.error'), message);
    }
  };

  const handlePickIncidenciaFile = async () => {
    if (!ImagePickerModule) {
      Alert.alert(
        t('incident.attachmentsUnavailableTitle'),
        t('incident.attachmentsUnavailableBody')
      );
      return;
    }

    const permission = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('incident.photosPermissionTitle'), t('incident.photosPermissionBody'));
      return;
    }

    const result = await ImagePickerModule.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) return;

    const selected = result.assets[0];
    setIncidenciaArchivo({
      uri: selected.uri,
      name: selected.fileName || `incidencia-${Date.now()}.jpg`,
      mimeType: selected.mimeType || 'image/jpeg',
    });
  };

  if (authLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={sem.accent} />
        <Text style={styles.loadingText}>{t('home.loading')}</Text>
      </View>
    );
  }
  // FILTRO LOCAL: Si el filtro de favoritos está activo, nos quedamos solo con las
   // estaciones cuyo ID está dentro de nuestro array favoriteIds.
   const displayedStations = showFavoritesFilter
       ? estaciones.filter(est => favoriteIds.includes(est.id)) : estaciones;
  if (!user) {
    return (
      <View style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.authContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={styles.cardCompact}>
            <SvgComponent width={150} height={125} />
            <Text style={styles.title}>{t('home.welcomeTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('home.welcomeSubtitle')}
            </Text>
            <View style={styles.authLinksRow}>
              <TouchableOpacity
                style={styles.adminLink}
                onPress={() => router.push('/company-login' as Href)}
                activeOpacity={0.8}
              >
                <Text style={styles.adminLinkText}>{t('login.companyAccess')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminLink}
                onPress={() => router.push('/admin-login')}
                activeOpacity={0.8}
              >
                <Text style={styles.adminLinkText}>{t('login.adminAccess')}</Text>
              </TouchableOpacity>
            </View>

            {authStep === 'username' ? (
              <>
                <Text style={styles.welcomeUsernameTitle}>{t('login.chooseUsernameTitle')}</Text>
                <Text style={styles.welcomeUsernameSubtitle}>
                  {t('login.chooseUsernameSubtitle')}
                </Text>
                <TextInput
                  style={styles.welcomeUsernameInput}
                  placeholder={t('common.username')}
                  placeholderTextColor="#9ca3af"
                  value={welcomeUsername}
                  onChangeText={setWelcomeUsername}
                  autoCapitalize="none"
                />
                {authError ? <Text style={styles.welcomeErrorText}>{authError}</Text> : null}
                <TouchableOpacity
                  style={styles.welcomePrimaryButton}
                  onPress={registerWithUsernameFromWelcome}
                  disabled={authLoadingGoogle}
                  activeOpacity={0.8}
                >
                  {authLoadingGoogle ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.welcomePrimaryButtonText}>{t('common.continue')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={resetWelcomeAuthToGoogle} style={styles.welcomeBackLink}>
                  <Text style={styles.welcomeBackLinkText}>{t('home.welcomeBackGoogle')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {authError ? <Text style={styles.welcomeErrorText}>{authError}</Text> : null}
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleNativeLoginFromWelcome}
                  disabled={authLoadingGoogle}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.loginButtonText}>{t('login.continueGoogle')}</Text>
                </TouchableOpacity>

                <Text style={styles.authSeparatorText}>{t('common.or')}</Text>

                <Text style={styles.localAuthHeading}>{t('home.localAuthHeading')}</Text>
                <TextInput
                  style={styles.welcomeUsernameInput}
                  placeholder={t('common.mail')}
                  placeholderTextColor="#9ca3af"
                  value={welcomeEmail}
                  onChangeText={setWelcomeEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.welcomeUsernameInput}
                  placeholder={t('common.password')}
                  placeholderTextColor="#9ca3af"
                  value={welcomePassword}
                  onChangeText={setWelcomePassword}
                />

                <TouchableOpacity
                  style={[styles.welcomePrimaryButton, styles.mailAuthButton]}
                  onPress={submitLocalWelcomeAuth}
                  activeOpacity={0.85}
                  disabled={authLoadingGoogle}
                >
                  {authLoadingGoogle ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.welcomePrimaryButtonText}>{t('login.signIn')}</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.authSeparatorText}>{t('common.or')}</Text>
                <TouchableOpacity
                  style={styles.welcomeBackLink}
                  onPress={() => router.push({ pathname: '/login', params: { mode: 'register' } })}
                  disabled={authLoadingGoogle}
                >
                  <Text style={styles.welcomeBackLinkText}>{t('home.registerCta')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar
        onPressMenu={() => setMenuOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        onSelectResult={handleSelectSearchResult}
        isSearching={isSearching}
        searchMode={searchMode}
        onToggleSearchMode={toggleSearchMode}
        onSubmitSearch={handleSubmitMapSearch}
      />

      {/* Aviso de selección de origen para cuando estamos seleccionando el punto de origen de una ruta */}
      {isSelectingOrigin && (
        <View style={styles.originSelectionNotice}>
          <View style={styles.originSelectionContent}>
            <MaterialIcons name="location-on" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.originSelectionText}>{t('home.originSelectHint')}</Text>
          </View>
          <TouchableOpacity //Botón de cerrar por si no queremos hacer una ruta.
            onPress={() => setIsSelectingOrigin(false)}
            style={styles.originSelectionClose}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* --- CAIXETA DE FILTRES ACTIUS APILATS --- */}
      {(hasFilters && selectedStation === null ) ? (
        <View style={styles.activeFiltersBadge}>

          {/* Columna esquerra: Llista de filtres */}
          <View style={styles.filtersColumn}>

            {/* Fila de Potència (només es mostra si n'hi ha) */}
            {!!powerText && (
              <View style={styles.filterRow}>
                <MaterialIcons name="bolt" size={18} color={sem.accent} />
                <Text style={styles.activeFiltersText}>{powerText}</Text>
                <TouchableOpacity
                  onPress={() => router.setParams({ minKw: '', maxKw: '', connectorType: connectorType || '', ac_dc: ac_dc || '', showFavorites: showFavoritesFilter ? 'true' : ''})}
                  hitSlop={8}
                  style={{ marginLeft: 4 }}
                >
                  <MaterialIcons name="filter-alt-off" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}

            {/* Fila de AC/DC (només es mostra si n'hi ha) */}
            {!!ac_dc && (
              <View style={styles.filterRow}>
                <MaterialIcons name="ev-station" size={18} color={sem.accent} />
                <Text style={styles.activeFiltersText}>
                  {ac_dc === 'AC' ? 'AC' : ac_dc === 'DC' ? 'DC' : ac_dc}
                </Text>
                <TouchableOpacity
                  onPress={() => router.setParams({ minKw: minKw || '', maxKw: maxKw || '', connectorType: connectorType || '', ac_dc: '', showFavorites: showFavoritesFilter ? 'true' : ''})}
                  hitSlop={8}
                  style={{ marginLeft: 4 }}
                >
                  <MaterialIcons name="filter-alt-off" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}

            {/* Fila de Connector (només es mostra si n'hi ha) */}
            {!!connectorType && (
              <View style={styles.filterRow}>
                <MaterialIcons name="electrical-services" size={18} color={sem.accent} />
                <Text style={styles.activeFiltersText}>{connectorType}</Text>
                <TouchableOpacity
                  onPress={() => router.setParams({ minKw: minKw || '', maxKw: maxKw || '', connectorType: '', ac_dc: ac_dc || '', showFavorites: showFavoritesFilter ? 'true' : ''})}
                  hitSlop={8}
                  style={{ marginLeft: 4 }}
                >
                  <MaterialIcons name="filter-alt-off" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}
            
            {/*Etiqueta de Favoritos */}
            {showFavoritesFilter && (
              <View style={styles.filterRow}>
                <MaterialIcons name="favorite" size={18} color={sem.favorite} />
                <Text style={styles.activeFiltersText}>{t('home.favoritesChip')}</Text>
                <TouchableOpacity
                  onPress={() => router.setParams({ minKw: minKw || '', maxKw: maxKw || '', connectorType: connectorType || '', ac_dc: ac_dc || '', showFavorites: '' })}
                  hitSlop={8}
                  style={{ marginLeft: 4 }}
                >
                  <MaterialIcons name="filter-alt-off" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}

          </View>

          {/* Columna dreta: Botó de tancar */}
          <TouchableOpacity
            onPress={() => router.setParams({ minKw: '', maxKw: '', connectorType: '', ac_dc: '', showFavorites: '' })}
            hitSlop={8}
            style={styles.clearFilterButton}
          >
            <MaterialIcons name="delete-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>

        </View>
      ) : null}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          key={`map-${displayedStations.length}-${isNavigating}`} 
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          showsUserLocation={false} 
          showsMyLocationButton={false} 
          showsUserHeading={true}
          //Al clicar en el mapa cogemos el punto exacto donde ha hecho clic y quitamos si habia una estación seleccionada
          onPress={(e: any) => {
            if (isSelectingOrigin) {
                  const origin = e.nativeEvent.coordinate;
                  void activateNavigation(() => {
                    setRouteOrigin(origin);
                    setIsSelectingOrigin(false);
                    setIsNavigating(true);
                  });
                  return;
            }
            if (isNavigating) {//Esto permite que si clicamos a un punto del mapa cuando estamos navegando en una ruta esto sea ignorado (para salir de la navegación hay un boton especifico)
                return
            }

            //Verificamos que el toque provenga del mapa y tenga coordenadas
            if (e.nativeEvent.coordinate) {
              //Limpiamos cualquier estación seleccionada previamente
              setSelectedStation(null);
              //Guardamos la nueva ubicación libre
              setSelectedLocation({
                latitude: e.nativeEvent.coordinate.latitude,
                longitude: e.nativeEvent.coordinate.longitude,
              });
              setRouteOriginPreset(null);
              setSelectedLocationLabel(null);
              //Limpiamos la ruta
              setIsNavigating(false);
              setRouteCoords([]);
              setRouteDestination(null);
              setRouteInfo(null);
            }
          }}
        >
          {/* Puntos de recarga (Los ocultamos si estamos navegando) */}
          {!isNavigating && displayedStations.map((est) => (
            <Marker
              key={`station-${est.id}`}
              coordinate={{
                latitude: parseFloat(est.latitud),
                longitude: parseFloat(est.longitud),
              }}
              pinColor={
                favoriteIds.includes(est.id)
                  ? sem.mapFavorite
                  : est.operatiu === false
                    ? sem.mapInactive
                    : sem.mapOk
              }
              onPress={(e: any) => {
                e.stopPropagation(); //Evita que el toque pase al mapa y cierre el panel

                //Si estamos eligiendo origen, interceptamos el clic en la estación
                if (isSelectingOrigin) {
                  void activateNavigation(() => {
                    setRouteOrigin({
                      latitude: parseFloat(est.latitud),
                      longitude: parseFloat(est.longitud),
                    });
                    setIsSelectingOrigin(false);
                    setIsNavigating(true);
                  });
                  return;
                }

                setSelectedStation(est);
                setSelectedLocation(null); //Limpiamos el punto manual si seleccionan una estación
                setRouteOriginPreset(null);
                setSelectedLocationLabel(null);
                setRouteCoords([]);
                setIsNavigating(false);
                setRouteInfo(null);
              }}
            />
          ))}

            {/*Marcador de la ubicacion clicada por el usuario con un clic manualmente */}
              {!isNavigating && selectedLocation && !selectedStation && (
                <Marker
                  key={`custom-loc-${selectedLocation.latitude}-${selectedLocation.longitude}`} //Soluciona el problema de que no se borren al clicar en otro sitio
                  coordinate={selectedLocation}
                  pinColor={sem.mapCustomLocation}
                  title={selectedLocationLabel || t('home.selectedLocationTitle')}
                />
            )}

            {/*EL DESTINO de la ruta: Para que se vea a dónde vamos cuando se ocultan los demás */}
                {isNavigating && routeDestination && (
                  <Marker
                    coordinate={routeDestination}
                    title={t('home.selectedLocationTitle')}
                    pinColor={sem.mapRouteDestination}
                  />
            )}

            {/* Trazado de la ruta (Solo visible si estamos navegando) */}
            {isNavigating && routeOrigin && routeDestination && (
              <MapViewDirections
                origin={routeOrigin}
                destination={routeDestination}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                strokeWidth={0}
                strokeColor={sem.routeLine}
                mode="DRIVING"
                onReady={(result) => {
                  setRouteInfo({
                    distance: result.distance,
                    duration: result.duration
                  });
                  setRouteCoords(result.coordinates);

                  if (!isDrivingMode && mapRef.current) {
                    mapRef.current.fitToCoordinates(result.coordinates, {
                      edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
                      animated: true
                    });
                  }
                }}
                onError={(errorMessage) => {
                  Alert.alert(t('navigation.routeErrorTitle'), t('navigation.routeErrorBody'));
                  console.log(errorMessage);
                }}
              />
            )}
            {/*Nuestro propio trazado de la ruta (100% controlable) */}
              {isNavigating && routeCoords.length > 0 && (
                <Polyline
                  key={`polyline-${routeCoords.length}`}
                  coordinates={routeCoords}
                  strokeWidth={4}
                  strokeColor={sem.routeLine}
                  lineJoin="round"
                />
            )}

            {/* MARCADOR DEL COCHE PERSISTENTE (Solución definitiva anti-bugs) */}
            {userLocation?.coords && activeSkinAsset && !!safeFocusEffect && (
            <Marker 
              testID="user-skin-marker"
              pinColor="blue" // Le indica al mock de tus compañeros que es el usuario, evitando duplicar 'station-marker'
              key={`user-skin-${activeSkinAsset}-${markerRefreshKey}`} 
              coordinate={{
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              zIndex={99999}
              tracksViewChanges={trackMarker}
              // @ts-ignore
              cluster={false}
            >
              <View style={{ width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}>
                <Image 
                  source={getSkinImage(activeSkinAsset)} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="contain"
                  fadeDuration={0}
                  onLoad={() => {
                    setTimeout(() => {
                      setTrackMarker(false);
                    }, 500);
                  }} 
                />
              </View>
            </Marker>
          )}
        </MapView>

        {/*BOTÓN DE CENTRAR UBICACIÓN MANUAL (Puesto tras el mapa para que flote por encima) */}
        <TouchableOpacity 
          style={styles.centerMapButton} 
          onPress={centerMapOnUser}
          activeOpacity={0.8}
        >
          <MaterialIcons name="my-location" size={26} color={isDark ? '#fff' : '#1f2937'} />
        </TouchableOpacity>

        {/* ========================================================== */}
        {/* A PARTIR DE AQUÍ VAN LOS PANELES UI (FUERA DEL MAPA) para cuando hay ruta */}
        {/* ========================================================== */}
        {/* Panel de Información de Ruta Activa */}
        {isNavigating && routeInfo && (
          <View style={styles.navPanel}>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTextBold} numberOfLines={1}>
                {t('home.navTowards', {
                  name: selectedStation ? selectedStation.nom : t('home.navDestination'),
                })}
              </Text>
              <Text style={styles.navText}>
                {routeInfo.distance.toFixed(1)} km • {Math.ceil(routeInfo.duration)} min
              </Text>
            </View>

            {/* BOTÓN PARA PASAR A MODO 3D */}
            {!isDrivingMode && (
              <TouchableOpacity
                style={[styles.startDrivingBtn, { marginRight: 10 }]}
                onPress={() => setIsDrivingMode(true)}
              >
                <MaterialIcons name="navigation" size={20} color="#fff" />
                <Text style={styles.startDrivingText}>{t('home.startDriving')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelRouteBtn}
              onPress={() => {
                setIsNavigating(false);
                setIsDrivingMode(false); // 🌟 También reseteamos el modo conducción
                setRouteOrigin(null);
                setRouteDestination(null);
                setRouteInfo(null);
                setRouteCoords([]);
                setSelectedStation(null);
                const cleared = buildClearEventLocationPatch();
                setSelectedLocation(cleared.selectedLocation);
                setRouteOriginPreset(cleared.routeOriginPreset);
                setSelectedLocationLabel(cleared.selectedLocationLabel);
              }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {loadingEstaciones && (
          <View style={styles.mapLoading} testID="map-stations-loading">
            <ActivityIndicator size="small" color={sem.accent} />
          </View>
        )}

        {/* Mini panel de información de la estación */}
        {!isNavigating && selectedStation && !isSelectingOrigin && (
          <StationBottomSheet
            station={selectedStation}
            onClose={() => setSelectedStation(null)}
            isFavorite={favoriteIds.includes(selectedStation.id)}
            onToggleFavorite={(isFav) => {
              if (isFav) {
                setFavoriteIds([...favoriteIds, selectedStation.id]);
              } else {
                setFavoriteIds(favoriteIds.filter(id => id !== selectedStation.id));
              }
            }}
            userLocation={userLocation}
            isCharging={isCharging}
            elapsedSeconds={elapsedSeconds}
            distanceToStation={distanceToStation}
            onStartCharging={handleStartCharging}
            onFinishCharging={handleFinishCharging}
            onCancelCharging={handleCancelCharging}
            chargingError={chargingError}
            setChargingError={setChargingError}
            onStartNavigation={handleStartNavigation}
            onOpenIncidenciaForm={handleOpenIncidenciaForm}
            onSolvedIncidencia={handleSolvedIncidenciaSubmit}
            onFocusEventOnMap={handleFocusEventOnMap}
          />
        )}

        {/* Mini panel para cuando se clica a una ubicacion cualquiera del mapa (De TU rama feature/rutas) */}
        {!isNavigating && selectedLocation && !selectedStation && (
          <View style={styles.infoPanel}>
            <View style={styles.infoHandle} />

            <View style={styles.infoTitleRow}>
              <MaterialIcons name="place" size={24} color={sem.mapCustomLocation} />
              <Text style={styles.infoTitle} numberOfLines={2}>
                {selectedLocationLabel || t('home.selectedLocationTitle')}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const cleared = buildClearEventLocationPatch();
                  setSelectedLocation(cleared.selectedLocation);
                  setRouteOriginPreset(cleared.routeOriginPreset);
                  setSelectedLocationLabel(cleared.selectedLocationLabel);
                }}
                style={styles.infoCloseBtn}
              >
                <MaterialIcons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                Lat: {selectedLocation.latitude.toFixed(5)}, Lon: {selectedLocation.longitude.toFixed(5)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.routeButton}
              activeOpacity={0.8}
              onPress={() => handleStartNavigation(selectedLocation)}
            >
              <Text style={styles.routeButtonText}>{t('home.howToArrive')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modal de resultado de carga (De la rama development) */}
        <ChargingResultModal
          visible={showResultModal}
          durationMinutes={chargingResult?.durationMinutes || 0}
          basePoints={chargingResult?.basePoints || 0}
          totalPoints={chargingResult?.totalPoints || 0}
          multiplier={chargingResult?.multiplier || 1}
          isPremium={chargingResult?.isPremium || false}
          isLoading={resultLoading}
          reason={chargingResult?.reason}
          onClose={() => {
            setShowResultModal(false);
            setChargingResult(null);
          }}
          onConfirm={handleResultModalConfirm}
        />
      </View>

      <Modal
        visible={showIncidenciaForm}
        transparent
        animationType="slide"
        onRequestClose={handleCloseIncidenciaForm}
      >
        <View style={styles.reportModalBackdrop}>
          <View style={styles.reportModalCard}>
            <Text style={styles.reportModalTitle}>{t('home.reportModalTitle')}</Text>
            <Text style={styles.reportLabel}>{t('home.comment')}</Text>
            <TextInput
              style={styles.reportTextarea}
              placeholder={t('home.describePlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={incidenciaComentario}
              onChangeText={setIncidenciaComentario}
            />

            <Text style={styles.reportLabel}>{t('home.type')}</Text>
            <View style={styles.reportTypeContainer}>
              {INCIDENCIA_TYPE_KEYS.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.reportTypeChip, incidenciaTipo === type && styles.reportTypeChipActive]}
                  onPress={() => setIncidenciaTipo(type)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reportTypeChipText, incidenciaTipo === type && styles.reportTypeChipTextActive]}>
                    {t(`incident.types.${type}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reportLabel}>{t('home.fileImage')}</Text>
            <TouchableOpacity
              style={styles.reportFileButton}
              onPress={handlePickIncidenciaFile}
              activeOpacity={0.8}
            >
              <MaterialIcons name="attach-file" size={18} color="#1f2937" />
              <Text style={styles.reportFileButtonText}>
                {incidenciaArchivo ? incidenciaArchivo.name : t('home.pickImage')}
              </Text>
            </TouchableOpacity>

            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.reportBackButton} onPress={handleCloseIncidenciaForm} activeOpacity={0.8}>
                <Text style={styles.reportBackButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportSubmitButton, incidenciaSubmitting && styles.reportSubmitButtonDisabled]}
                onPress={handleIncidenciaSubmit}
                activeOpacity={0.8}
                disabled={incidenciaSubmitting}
              >
                <Text style={styles.reportSubmitButtonText}>{incidenciaSubmitting ? t('home.sending') : t('common.send')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuDrawer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{t('menu.settings')}</Text>
              <TouchableOpacity
                onPress={() => setMenuOpen(false)}
                style={styles.menuClose}
                hitSlop={12}
              >
                <MaterialIcons name="close" size={24} color={isDark ? '#fff' : '#1f2937'} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false); // Tanquem el menú
                router.push({
                  pathname: '../user',
                  params: { userId: user.id }
                });
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="person" size={22} color={isDark ? '#fff' : '#1f2937'} />
              <Text style={styles.menuItemText}>{t('menu.myProfile')}</Text>
            </TouchableOpacity>

            {/*Boton para añadir filtros*/}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false); // Tanquem el menú
                router.push({
                  pathname: '/filters',
                  params: {
                    minKw: minKw || '',
                    maxKw: maxKw || '',
                    showFavorites: showFavoritesFilter ? 'true' : '',
                    connectorType: connectorType || '',
                    ac_dc: ac_dc || ''
                  }
                });
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="filter-list" size={22} color={isDark ? '#fff' : '#1f2937'} />
              <Text style={styles.menuItemText}>{t('menu.addFilters')}</Text>
            </TouchableOpacity>

            {/* Botón para ver estaciones favoritas */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false); // Tanquem el menú
                router.push('../my-favorite-stations');
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="favorite" size={22} color={sem.favorite} />
              <Text style={styles.menuItemText}>{t('menu.myStations')}</Text>
            </TouchableOpacity>

              {/* Botón para ir al asistente IA (De tu rama chatbot) */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/support-chat'); 
              }}
            >
              <MaterialIcons name="support-agent" size={24} color="#10b981" />
              <Text style={styles.menuItemText}>{t('menu.virtualAssistant')}</Text>
            </TouchableOpacity>

            {/* Opciones de Accesibilidad y Tema (De la rama development) */}
            <View style={styles.themeSection}>
              <Text style={styles.themeSectionTitle}>{t('menu.colorblindSection')}</Text>
              <View style={styles.dyslexiaRow}>
                <View style={styles.dyslexiaTexts}>
                  <Text style={styles.dyslexiaTitle}>{t('menu.accessibleMode')}</Text>
                  <Text style={styles.dyslexiaHint}>{t('menu.accessibleHint')}</Text>
                </View>
                <Switch
                  testID="colorblind-friendly-switch"
                  value={colorblindFriendly}
                  onValueChange={setColorblindFriendly}
                  trackColor={{ false: isDark ? '#475569' : '#cbd5e1', true: sem.accent }}
                  thumbColor="#f8fafc"
                />
              </View>
            </View>

            <View style={styles.themeSection}>
              <Text style={styles.themeSectionTitle}>{t('menu.theme')}</Text>
              <View style={styles.themeSegment}>
                <TouchableOpacity
                  style={[styles.themeOption, preference === 'light' && styles.themeOptionActive]}
                  onPress={() => setPreference('light')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.themeOptionText, preference === 'light' && styles.themeOptionTextActive]}>{t('menu.themeLight')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, preference === 'dark' && styles.themeOptionActive]}
                  onPress={() => setPreference('dark')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.themeOptionText, preference === 'dark' && styles.themeOptionTextActive]}>{t('menu.themeDark')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <LanguageMenuSelector isDark={isDark} accent={sem.accent} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setMenuOpen(false);
                try {
                  await GoogleSignin.signOut();
                } catch (_e) {
                  // Si no hay sesión Google activa, igualmente cerramos sesión local.
                }
                logout();
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="logout" size={22} color={isDark ? '#fff' : '#1f2937'} />
              <Text style={styles.menuItemText}>{t('menu.logout')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type InicioScreenTheme = {
  screenBg: string;
  mutedText: string;
  cardBg: string;
  titleText: string;
  subtitleText: string;
  border: string;
  inputBorder: string;
  textPrimary: string;
  textEmphasis: string;
  handle: string;
  infoTitle: string;
  promotorText: string;
  menuBackdrop: string;
  themeSegmentBg: string;
  themeOptionActiveBg: string;
  themeOptionText: string;
  themeOptionTextActive: string;
  errorBannerBg: string;
  reportBackdrop: string;
  formBorder: string;
  chipBg: string;
  chipText: string;
  secondaryButtonBg: string;
  secondaryButtonText: string;
  labelText: string;
};

const INICIO_SCREEN_THEME: Record<'dark' | 'light', InicioScreenTheme> = {
  dark: {
    screenBg: '#0f172a',
    mutedText: '#94a3b8',
    cardBg: '#1e293b',
    titleText: '#f1f5f9',
    subtitleText: '#94a3b8',
    border: '#334155',
    inputBorder: '#334155',
    textPrimary: '#f1f5f9',
    textEmphasis: '#e2e8f0',
    handle: '#475569',
    infoTitle: '#f1f5f9',
    promotorText: '#cbd5e1',
    menuBackdrop: 'rgba(0,0,0,0.55)',
    themeSegmentBg: '#334155',
    themeOptionActiveBg: '#0f172a',
    themeOptionText: '#cbd5e1',
    themeOptionTextActive: '#f1f5f9',
    errorBannerBg: '#7f1d1d',
    reportBackdrop: 'rgba(0,0,0,0.6)',
    formBorder: '#475569',
    chipBg: '#334155',
    chipText: '#cbd5e1',
    secondaryButtonBg: '#334155',
    secondaryButtonText: '#e2e8f0',
    labelText: '#cbd5e1',
  },
  light: {
    screenBg: '#f5f5f5',
    mutedText: '#64748b',
    cardBg: '#fff',
    titleText: '#1a1a1a',
    subtitleText: '#6b7280',
    border: '#e2e8f0',
    inputBorder: '#e5e7eb',
    textPrimary: '#1f2937',
    textEmphasis: '#111827',
    handle: '#e2e8f0',
    infoTitle: '#1e293b',
    promotorText: '#94a3b8',
    menuBackdrop: 'rgba(0,0,0,0.4)',
    themeSegmentBg: '#f1f5f9',
    themeOptionActiveBg: '#ffffff',
    themeOptionText: '#475569',
    themeOptionTextActive: '#111827',
    errorBannerBg: '#fee2e2',
    reportBackdrop: 'rgba(0,0,0,0.45)',
    formBorder: '#d1d5db',
    chipBg: '#f8fafc',
    chipText: '#4b5563',
    secondaryButtonBg: '#f3f4f6',
    secondaryButtonText: '#374151',
    labelText: '#374151',
  },
};

const createStyles = (isDark: boolean, sem: SemanticColors) => {
  const t = INICIO_SCREEN_THEME[isDark ? 'dark' : 'light'];
  const errorTextColor = isDark ? sem.errorTextDark : sem.errorTextLight;
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.screenBg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: t.mutedText,
    marginTop: 10,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: t.cardBg,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)', // width, height, blur, color amb opacitat
    elevation: 4,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cardCompact: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: t.cardBg,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: t.titleText,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: t.subtitleText,
    textAlign: 'center',
    marginBottom: 18,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: t.cardBg,
    borderWidth: 1,
    borderColor: t.border,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: t.textPrimary,
  },
  authSeparatorText: {
    marginTop: 12,
    marginBottom: 8,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  localAuthHeading: {
    width: '100%',
    fontSize: 18,
    fontWeight: '700',
    color: t.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  adminLink: {
    marginBottom: 16,
  },
  authLinksRow: {
    flexDirection: 'row',
    gap: 16,
  },
  adminLinkText: {
    fontSize: 14,
    color: t.textEmphasis,
    fontWeight: '600',
  },
  welcomeUsernameTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: t.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeUsernameSubtitle: {
    fontSize: 14,
    color: t.subtitleText,
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeUsernameInput: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: t.inputBorder,
    color: t.textEmphasis,
    borderRadius: 10,
    marginBottom: 16,
  },
  welcomeErrorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    width: '100%',
  },
  welcomePrimaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: sem.accent,
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomePrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mailAuthButton: {
    marginBottom: 2,
  },
  welcomeBackLink: {
    paddingVertical: 8,
  },
  welcomeBackLinkText: {
    fontSize: 14,
    color: t.mutedText,
    fontWeight: '500',
  },
  centerMapButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 48,
    height: 48,
    backgroundColor: t.cardBg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 3,
  },
  mapContainer: {
    flex: 1,
  },
  mapLoading: {
    position: 'absolute',
    top: 24,
    left: 24,
    backgroundColor: t.cardBg,
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
  },
  infoPanel: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: t.cardBg,
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 10,
  },
  infoHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.handle,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  infoTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.infoTitle,
    flex: 1,
  },
  infoCloseBtn: {
    padding: 4,
  },
  infoContent: {
    gap: 10,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: t.mutedText,
    flex: 1,
  },
  infoBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoPromotor: {
    fontSize: 12,
    color: t.promotorText,
    fontStyle: 'italic',
  },
  routeButton: {
    backgroundColor: sem.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  reportButton: {
    backgroundColor: sem.mapCustomLocation,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  solvedReportButton: {
    backgroundColor: sem.routeLine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: t.menuBackdrop,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuDrawer: {
    width: '75%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: t.cardBg,
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: t.textPrimary,
  },
  menuClose: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: t.textPrimary,
  },
  themeSection: {
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  themeSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: t.mutedText,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  themeSegment: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: t.themeSegmentBg,
    padding: 4,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionActive: {
    backgroundColor: t.themeOptionActiveBg,
  },
  themeOptionText: {
    color: t.themeOptionText,
    fontSize: 13,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    color: t.themeOptionTextActive,
    fontWeight: '700',
  },
  dyslexiaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dyslexiaTexts: {
    flex: 1,
    paddingRight: 8,
  },
  dyslexiaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: t.themeOptionTextActive,
  },
  dyslexiaHint: {
    marginTop: 2,
    fontSize: 12,
    color: t.mutedText,
  },
  userDot: {
    width: 18,
    height: 18,
    backgroundColor: '#3b82f6',
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#ffffff',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.3)', // width, height, blur, color amb opacitat
  },
  // --- ESTILS DE LA CAIXETA DE FILTRES ---
  activeFiltersBadge: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: t.cardBg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    borderWidth: 1,
    borderColor: t.border,
  },
  filtersColumn: {
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
activeFiltersText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.textPrimary,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  clearFilterButton: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: t.border,
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingTop: 2,
  },

  // --- Estilos de los componentes de rutas de navegacion ---
  navPanel: {
    position: 'absolute',
    top: 50, // Ajusta según tu TopBar
    left: 20,
    right: 20,
    backgroundColor: t.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 100,
    borderWidth: 2,
    borderColor: sem.accent,
  },
  navTextBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: t.textPrimary,
    marginBottom: 4,
  },
  navText: {
    fontSize: 14,
    color: t.subtitleText,
  },
  cancelRouteBtn: {
    backgroundColor: sem.error,
    padding: 10,
    borderRadius: 50,
  },
  selectingOriginPanel: {
    position: 'absolute',
    top: 50, // Ajusta según tu TopBar
    left: 20,
    right: 20,
    backgroundColor: '#3b82f6', // Un color azul que destaque
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 5,
  },
  selectingOriginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  cancelSelectingBtn: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  originSelectionNotice: {
    position: 'absolute',
    top: 100, // Ajusta este valor para que quede justo debajo de tu buscador/TopBar
    left: 20,
    right: 20,
    backgroundColor: '#3b82f6', // Azul eléctrico
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999, // Para que esté al principio
    elevation: 5, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  originSelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  originSelectionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  originSelectionClose: {
    marginLeft: 20,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', //Fondo traslúcido para el botón
    borderRadius: 15,
  },

  // --- Estilos de carga (development) ---
  chargingButtonContainer: {
    marginTop: 16,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.errorBannerBg,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: errorTextColor,
    fontSize: 14,
    flex: 1,
  },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: t.reportBackdrop,
    justifyContent: 'center',
    padding: 18,
  },
  reportModalCard: {
    backgroundColor: t.cardBg,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: t.themeOptionTextActive,
    marginBottom: 4,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: t.labelText,
  },
  reportTextarea: {
    borderWidth: 1,
    borderColor: t.formBorder,
    borderRadius: 10,
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: t.textEmphasis,
    textAlignVertical: 'top',
  },
  reportFileButton: {
    borderWidth: 1,
    borderColor: t.formBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportFileButtonText: {
    color: t.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportTypeChip: {
    borderWidth: 1,
    borderColor: t.formBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: t.chipBg,
  },
  reportTypeChipActive: {
    borderColor: sem.accent,
    backgroundColor: sem.chipActiveBg,
  },
  reportTypeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.chipText,
  },
  reportTypeChipTextActive: {
    color: sem.chipActiveText,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  reportBackButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: t.secondaryButtonBg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportBackButtonText: {
    color: t.secondaryButtonText,
    fontWeight: '700',
    fontSize: 15,
  },
  reportSubmitButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: sem.accent,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportSubmitButtonDisabled: {
    opacity: 0.6,
  },
  reportSubmitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  startDrivingBtn: {
    backgroundColor: '#3b82f6', // Azul Google
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  startDrivingText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  });
};
