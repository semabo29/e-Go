// Inicio (primera pestaña). Sin sesión: bienvenida + Google. Con sesión: menú 3 barras + PANTALLA PRINCIPAL.
import { useMemo, useState, useEffect, useRef } from 'react';
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
import { getApiUrl, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import { ChargingTimerDisplay } from '../../components/ChargingTimerDisplay';
import { ChargingActionCard } from '../../components/ChargingActionCard';
import { ChargingResultModal } from '../../components/ChargingResultModal';
import { StartChargingButton } from '../../components/StartChargingButton';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useThemePreference } from '@/contexts/ThemePreferenceContext';
import { getSemanticColors } from '@/constants/accessibilityColors';
import type { SemanticColors } from '@/constants/accessibilityColors';
import {
  requestLocationPermissions,
  isLocationServiceEnabled,
  getCurrentLocation,
  calculateDistanceInMeters
} from '@/services/chargingLocationService';
import {
  startChargingSession as apiStartCharging,
  endChargingSession as apiEndCharging
} from '@/services/chargingApiService';

//Importamos el boton de favoritos
import { FavoriteButton } from '../../components/FavoriteButton';

//Importamos el mapa de direcciones
import MapViewDirections from 'react-native-maps-directions';
import { Polyline } from 'react-native-maps';
import {StationBottomSheet} from "@/components/StationBottomSheet"; //Para pintar el trazado de la ruta

const LOGO = require('../_assets/favicon.png'); //Siempre ha de ir debajo de los imports
let ImagePickerModule: typeof import('expo-image-picker') | null = null;
try {
  ImagePickerModule = require('expo-image-picker');
} catch (_e) {
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

export default function InicioScreen() {
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

  const { user, setUser, logout, isLoading: authLoading } = useAuth();
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
  const INCIDENCIA_TYPES = ['Avariat', 'Inexistent', 'DadesIncorrectes', 'Altres'];

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
  //Estado para saber las coordenadas que ocupan la ruta
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  //Estado para saber si estamos seleccionando nosotros mismos el origen de la ruta
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);

  //Funcion para empezar la navegacion
  const handleStartNavigation = (coordenadas: {latitude: number, longitude: number}) => {
      setRouteCoords([]);
      setRouteInfo(null);
      setRouteDestination(coordenadas);
      //Preguntamos al usuario el origen
      Alert.alert(
        "Iniciar ruta",
        "¿Desde dónde quieres calcular la ruta?",
        [
          {
            text: "Mi ubicación actual",
            onPress: () => {
              if (userLocation && userLocation.coords) {
                setRouteOrigin({
                  latitude: userLocation.coords.latitude,
                  longitude: userLocation.coords.longitude
                });
                setIsNavigating(true);
              } else {
                Alert.alert("GPS desactivado", "No podemos encontrar tu ubicación actual.");
              }
            }
          },
          {
            text: "Buscar otro origen",
            onPress: () => {
              setIsSelectingOrigin(true); //Activamos el modo selección de punto de origen
              //Alert.alert("Modo búsqueda", "Busca un lugar en la barra superior para usarlo como origen.");
            }
          },
          { text: "Cancelar", style: "cancel" }
        ]
      );
  };
  // Función para manejar el inicio de una sesión de carga
  const handleStartCharging = async (): Promise<boolean> => {
    if (!user || !selectedStation || !userLocation) {
      setChargingError('Faltan datos necesarios para iniciar la carga');
      return false;
    }

    try {
      // Verificar permisos de ubicación
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        setChargingError('Necesitas otorgar permisos de ubicación');
        return false;
      }

      // Verificar que los servicios de ubicación estén habilitados
      const isEnabled = await isLocationServiceEnabled();
      if (!isEnabled) {
        setChargingError('Por favor, activa los servicios de ubicación en tu dispositivo');
        return false;
      }

      // Obtener ubicación actual
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        setChargingError('No se pudo obtener tu ubicación actual');
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
          'Demasiado lejos',
          `Te encuentras a ${distance} metros del punto de carga.\n\nDebes acercarte a menos de 30 metros para poder iniciar la carga.`,
          [{ text: 'Entendido', style: 'default' }]
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
      const message = error instanceof Error ? error.message : 'Error al iniciar carga';
      setChargingError(message);
      console.error('Error iniciando carga:', error);
      return false;
    }
  };

  // Escoltar si el context tanca la sessió automàticament (ex: distància superada)
    useEffect(() => {
      if (autoStopResult) {
        const points = autoStopResult.apiResponse?.pointsGained || { basePoints: 0, totalPoints: 0, multiplier: 1 };

        setChargingResult({
          durationMinutes: autoStopResult.durationMinutes,
          basePoints: points.basePoints,
          totalPoints: points.totalPoints,
          multiplier: points.multiplier,
          isPremium: autoStopResult.apiResponse?.isPremium || false,
          sessionId: autoStopResult.session?.id || 0,
          reason: autoStopResult.reason,
        });

        setShowResultModal(true);
        clearAutoStopResult(); // Ho netegem perquè no es torni a obrir sol
      }
    }, [autoStopResult]);

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

          setChargingResult({
            durationMinutes: result.durationMinutes,
            basePoints: points.basePoints,
            totalPoints: points.totalPoints,
            multiplier: points.multiplier,
            isPremium: result.apiResponse.isPremium,
            sessionId: result.session?.id || 0,
            reason: result.reason,
          });

          setShowResultModal(true);
        }
      } catch (error) {
        console.error('Error al finalizar:', error);
        Alert.alert('Error', 'No se ha podido finalizar la sesión correctamente.');
      } finally {
        setResultLoading(false);
      }
    };

  // Función para cancelar la carga
  const handleCancelCharging = () => {
    Alert.alert(
      'Cancelar carga',
      '¿Estás seguro de que deseas cancelar la sesión de carga?',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Cancelar sesión',
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
    //metida dentro pq solo se usa una vez
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { //alerta para informar el proque de la necesidad de ubi
        Alert.alert(
          'Permiso necesario',
          'Para mostrarte los puntos de carga más cercanos, necesitamos acceso a tu ubicación.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);

      // Animar mapa a la ubicación del usuario comprobando compatibilidad
      if (location && mapRef.current) {
        if (typeof mapRef.current.animateToRegion === 'function') {
          mapRef.current.animateToRegion(
            { ...location.coords, latitudeDelta: 0.05, longitudeDelta: 0.05 },
            1000
          );
        }
      }
    })();
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

  const fetchEstaciones = async () => {
    setLoadingEstaciones(true);
    try {
      let queryParams = [];

      if (minKw) queryParams.push(`minKw=${minKw}`);
      if (maxKw) queryParams.push(`maxKw=${maxKw}`);
      if (connectorType) queryParams.push(`connectorType=${encodeURIComponent(connectorType)}`);
      if (ac_dc) queryParams.push(`ac_dc=${ac_dc}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const url = `${getApiUrl()}/stations${queryString}`;

      const response = await fetch(url);
      const data = await response.json();

      setEstaciones(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error('Error cargando estaciones:', error);
      setEstaciones([]); // Si falla la red, vaciamos para evitar errores de .map()
    } finally {
        setLoadingEstaciones(false);

    }
  };

const fetchUserFavorites = async () => {
  if (!user?.id) return;
  try {
    const response = await fetch(`${getApiUrl()}/favorites?usuari_id=${user.id}`);
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
    console.log("IDs favoritos cargados:", ids);
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

// Efecte per buscar quan l'usuari escriu (amb debounce de 500ms)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchMode === 'addresses') {
          const response = await fetch(
            `${getApiUrl()}/geocode/autocomplete?input=${encodeURIComponent(searchQuery)}`
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

        let queryParams = [`q=${encodeURIComponent(searchQuery)}`];

        if (minKw) queryParams.push(`minKw=${minKw}`);
        if (maxKw) queryParams.push(`maxKw=${maxKw}`);
        if (connectorType) queryParams.push(`connectorType=${encodeURIComponent(connectorType)}`);
        if (ac_dc) queryParams.push(`ac_dc=${ac_dc}`);

        // Ajuntem tots els paràmetres amb un "&"
        const queryString = queryParams.join('&');

        const response = await fetch(`${getApiUrl()}/stations/search?${queryString}`);
        const data = await response.json();

        // --- APLIQUEM EL FILTRE DE FAVORITS LOCALMENT ---
        let resultatsFinals = Array.isArray(data) ? data : [];
        if (showFavoritesFilter) {
          resultatsFinals = resultatsFinals.filter((est: Estacion) => favoriteIds.includes(est.id));
        }
        setSearchResults(
          resultatsFinals.map((est: Estacion) => ({ kind: 'station' as const, station: est }))
        );
      } catch (error) {
        console.error('Error cercant estacions:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Espera mig segon després de parar d'escriure

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchMode, minKw, maxKw, connectorType, ac_dc, showFavoritesFilter, favoriteIds]);


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
    powerText = `${minKw} - ${maxKw} kW`;
  } else if (minKw) {
    powerText = `≥ ${minKw} kW`;
  } else if (maxKw) {
    powerText = `≤ ${maxKw} kW`;
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
        setAuthError('No se pudo obtener el token de Google');
        return;
      }

      let res: Response;
      try {
        res = await fetch(`${getApiUrl()}/auth/google`, {
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
              ? `No llega al backend. URL usada: ${base}. Con USB usa npm run start:usb (cierra Metro y vuelve a abrir), adb reverse y backend en marcha en el PC.`
              : 'No llega al backend. Comprueba conexión y que el servidor esté en marcha.'
          );
        } else {
          setAuthError('No se pudo conectar con el servidor.');
        }
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Error al iniciar sesión');
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
        setAuthError('Ya hay un inicio de sesión en curso');
      } else {
        setAuthError('Error al conectar con Google');
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
      const res = await fetch(`${getApiUrl()}/auth/register`, {
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
        setAuthError(data.error || 'Error al registrarse');
      }
    } catch (_e) {
      setAuthError('No se pudo conectar con el servidor.');
    } finally {
      setAuthLoadingGoogle(false);
    }
  }

  async function submitLocalWelcomeAuth() {
    if (!welcomeEmail.trim() || !welcomePassword.trim()) {
      setAuthError('Email y contraseña son obligatorios');
      return;
    }

    setAuthLoadingGoogle(true);
    setAuthError('');
    try {
      const res = await fetch(`${getApiUrl()}/auth/local/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: welcomeEmail.trim(),
          password: welcomePassword,
        }),
      });
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || 'No se pudo iniciar sesión');
        return;
      }
      if (data.user) {
        setUser({
          ...data.user,
          token: data.token // Assumint que el teu backend envia el token a "data.token"
        });
      }
    } catch (_e) {
      setAuthError('No se pudo conectar con el servidor.');
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
      Alert.alert('Campos obligatorios', 'Debes rellenar comentario y tipo.');
      return;
    }

    setIncidenciaSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('comentari', incidenciaComentario.trim());
      formData.append('tipus', incidenciaTipo);
      formData.append('conductor', String(user.id));
      formData.append('estacio', String(selectedStation.id));

      if (incidenciaArchivo) {
        formData.append('arxiu', {
          uri: incidenciaArchivo.uri,
          name: incidenciaArchivo.name,
          type: incidenciaArchivo.mimeType,
        } as any);
      }

      const response = await fetch(`${getApiUrl()}/incidencias`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo registrar la incidencia');
      }

      Alert.alert('Incidencia enviada', 'La incidencia se ha registrado correctamente.');
      handleCloseIncidenciaForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al enviar la incidencia';
      Alert.alert('Error', message);
    } finally {
      setIncidenciaSubmitting(false);
    }
  };

  const handleSolvedIncidenciaSubmit = async () => {
    if (!user || !selectedStation) return;

    try {
      const formData = new FormData();
      formData.append('comentari', 'La Incidencia está solucionada');
      formData.append('tipus', 'Operatiu');
      formData.append('conductor', String(user.id));
      formData.append('estacio', String(selectedStation.id));

      const response = await fetch(`${getApiUrl()}/incidencias`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo registrar la incidencia solucionada');
      }

      Alert.alert('Incidencia reportada', 'Se ha marcado la estación como operativa.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al reportar incidencia solucionada';
      Alert.alert('Error', message);
    }
  };

  const handlePickIncidenciaFile = async () => {
    if (!ImagePickerModule) {
      Alert.alert(
        'Adjuntos no disponibles',
        'Este dispositivo aún no tiene habilitado el módulo nativo para seleccionar imágenes.'
      );
      return;
    }

    const permission = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tus imágenes.');
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
        <Text style={styles.loadingText}>Cargando…</Text>
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
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Bienvenido a e-Go</Text>
            <Text style={styles.subtitle}>
              Tu navegador de estaciones de carga en Catalunya
            </Text>
            <View style={styles.authLinksRow}>
              <TouchableOpacity
                style={styles.adminLink}
                onPress={() => router.push('/company-login' as Href)}
                activeOpacity={0.8}
              >
                <Text style={styles.adminLinkText}>Acceso Empresa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminLink}
                onPress={() => router.push('/admin-login')}
                activeOpacity={0.8}
              >
                <Text style={styles.adminLinkText}>Acceso Admin</Text>
              </TouchableOpacity>
            </View>

            {authStep === 'username' ? (
              <>
                <Text style={styles.welcomeUsernameTitle}>Elige tu nombre de usuario</Text>
                <Text style={styles.welcomeUsernameSubtitle}>
                  Así aparecerás en la aplicación
                </Text>
                <TextInput
                  style={styles.welcomeUsernameInput}
                  placeholder="Nombre de usuario"
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
                    <Text style={styles.welcomePrimaryButtonText}>Continuar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={resetWelcomeAuthToGoogle} style={styles.welcomeBackLink}>
                  <Text style={styles.welcomeBackLinkText}>Volver a Google</Text>
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
                  <Text style={styles.loginButtonText}>Continuar con Google</Text>
                </TouchableOpacity>

                <Text style={styles.authSeparatorText}>o</Text>

                <Text style={styles.localAuthHeading}>Inicia sesión</Text>
                <TextInput
                  style={styles.welcomeUsernameInput}
                  placeholder="Mail"
                  placeholderTextColor="#9ca3af"
                  value={welcomeEmail}
                  onChangeText={setWelcomeEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.welcomeUsernameInput}
                  placeholder="Contraseña"
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
                    <Text style={styles.welcomePrimaryButtonText}>Iniciar sesión</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.authSeparatorText}>o</Text>
                <TouchableOpacity
                  style={styles.welcomeBackLink}
                  onPress={() => router.push({ pathname: '/login', params: { mode: 'register' } })}
                  disabled={authLoadingGoogle}
                >
                  <Text style={styles.welcomeBackLinkText}>Regístrate</Text>
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
      />

      {/* Aviso de selección de origen para cuando estamos seleccionando el punto de origen de una ruta */}
      {isSelectingOrigin && (
        <View style={styles.originSelectionNotice}>
          <View style={styles.originSelectionContent}>
            <MaterialIcons name="location-on" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.originSelectionText}>Selecciona el punto de origen en el mapa</Text>
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
                <Text style={styles.activeFiltersText}>Favoritos</Text>
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
          key={`map-${displayedStations.length}-${isNavigating}`}  //TRUCO VITAL: Fuerza al mapa a pintarse cuando llegan los datos o cuando se acaba la navegación (para borrar el recorrido de esta)
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          showsUserLocation={true}
          showsUserHeading={true}
          //Al clicar en el mapa cogemos el punto exacto donde ha hecho clic y quitamos si habia una estación seleccionada
          onPress={(e: any) => {
            if (isSelectingOrigin) {//Si estamos seleccionando un punto de origen para la ruta solo hacemos el cuerpo del if
                  setRouteOrigin(e.nativeEvent.coordinate); //Guardamos donde ha tocado como origen
                  setIsSelectingOrigin(false); //Salimos del modo selección
                  setIsNavigating(true); //Iniciamos la navegación
                  return; //Cortamos la ejecución aquí
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
                  setRouteOrigin({
                    latitude: parseFloat(est.latitud),
                    longitude: parseFloat(est.longitud)
                  });
                  setIsSelectingOrigin(false);
                  setIsNavigating(true);
                  return; //Cortamos aquí
                }

                setSelectedStation(est);
                setSelectedLocation(null); //Limpiamos el punto manual si seleccionan una estación
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
                  title="Ubicación seleccionada"
                />
            )}

            {/*EL DESTINO de la ruta: Para que se vea a dónde vamos cuando se ocultan los demás */}
                {isNavigating && routeDestination && (
                  <Marker
                    coordinate={routeDestination}
                    title="Ubicación seleccionada"
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
                  Alert.alert("Error de ruta", "No se ha podido calcular la ruta");
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
        </MapView>
          {/* ========================================================== */}
          {/* A PARTIR DE AQUÍ VAN LOS PANELES UI (FUERA DEL MAPA) para cuando hay ruta */}
          {/* ========================================================== */}
            {/* Panel de Información de Ruta Activa */}
            {isNavigating && routeInfo && (
              <View style={styles.navPanel}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTextBold} numberOfLines={1}>
                    Hacia {selectedStation ? selectedStation.nom : 'tu destino'}
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
                    <Text style={styles.startDrivingText}>Iniciar</Text>
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
                    setSelectedLocation(null);
                    setSelectedStation(null);
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

        {loadingEstaciones && (
          <View style={styles.mapLoading}>
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
          />
        )}

        {/* Mini panel para cuando se clica a una ubicacion cualquiera del mapa (De TU rama feature/rutas) */}
        {!isNavigating && selectedLocation && !selectedStation && (
          <View style={styles.infoPanel}>
            <View style={styles.infoHandle} />

            <View style={styles.infoTitleRow}>
              <MaterialIcons name="place" size={24} color={sem.mapCustomLocation} />
              <Text style={styles.infoTitle} numberOfLines={1}>
                Ubicación seleccionada
              </Text>

              <TouchableOpacity
                onPress={() => setSelectedLocation(null)}
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
              <Text style={styles.routeButtonText}>Cómo llegar</Text>
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
            <Text style={styles.reportModalTitle}>Reportar incidencia</Text>
            <Text style={styles.reportLabel}>Comentario</Text>
            <TextInput
              style={styles.reportTextarea}
              placeholder="Describe qué ha ocurrido"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={incidenciaComentario}
              onChangeText={setIncidenciaComentario}
            />

            <Text style={styles.reportLabel}>Tipo</Text>
            <View style={styles.reportTypeContainer}>
              {INCIDENCIA_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.reportTypeChip, incidenciaTipo === type && styles.reportTypeChipActive]}
                  onPress={() => setIncidenciaTipo(type)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reportTypeChipText, incidenciaTipo === type && styles.reportTypeChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reportLabel}>Archivo (imagen)</Text>
            <TouchableOpacity
              style={styles.reportFileButton}
              onPress={handlePickIncidenciaFile}
              activeOpacity={0.8}
            >
              <MaterialIcons name="attach-file" size={18} color="#1f2937" />
              <Text style={styles.reportFileButtonText}>
                {incidenciaArchivo ? incidenciaArchivo.name : 'Seleccionar imagen del dispositivo'}
              </Text>
            </TouchableOpacity>

            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.reportBackButton} onPress={handleCloseIncidenciaForm} activeOpacity={0.8}>
                <Text style={styles.reportBackButtonText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportSubmitButton, incidenciaSubmitting && styles.reportSubmitButtonDisabled]}
                onPress={handleIncidenciaSubmit}
                activeOpacity={0.8}
                disabled={incidenciaSubmitting}
              >
                <Text style={styles.reportSubmitButtonText}>{incidenciaSubmitting ? 'Enviando...' : 'Enviar'}</Text>
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
              <Text style={styles.menuTitle}>Ajustes</Text>
              <TouchableOpacity
                onPress={() => setMenuOpen(false)}
                style={styles.menuClose}
                hitSlop={12}
              >
                <MaterialIcons name="close" size={24} color="#1f2937" />
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
              <MaterialIcons name="person" size={22} color="#1f2937" />
              <Text style={styles.menuItemText}>Mi perfil</Text>
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
              <MaterialIcons name="filter-list" size={22} color="#1f2937" />
              <Text style={styles.menuItemText}>Añadir Filtros</Text>
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
              <Text style={styles.menuItemText}>Mis Estaciones de Carga</Text>
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
              <Text style={styles.menuItemText}>Asistente Virtual</Text>
            </TouchableOpacity>

            {/* Opciones de Accesibilidad y Tema (De la rama development) */}
            <View style={styles.themeSection}>
              <Text style={styles.themeSectionTitle}>Daltonismo</Text>
              <View style={styles.dyslexiaRow}>
                <View style={styles.dyslexiaTexts}>
                  <Text style={styles.dyslexiaTitle}>Modo accesible</Text>
                  <Text style={styles.dyslexiaHint}>Colores del mapa y acentos más distinguibles</Text>
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
              <Text style={styles.themeSectionTitle}>Tema</Text>
              <View style={styles.themeSegment}>
                <TouchableOpacity
                  style={[styles.themeOption, preference === 'light' && styles.themeOptionActive]}
                  onPress={() => setPreference('light')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.themeOptionText, preference === 'light' && styles.themeOptionTextActive]}>Claro</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, preference === 'dark' && styles.themeOptionActive]}
                  onPress={() => setPreference('dark')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.themeOptionText, preference === 'dark' && styles.themeOptionTextActive]}>Oscuro</Text>
                </TouchableOpacity>
              </View>
            </View>

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
              <MaterialIcons name="logout" size={22} color="#1f2937" />
              <Text style={styles.menuItemText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (isDark: boolean, sem: SemanticColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: isDark ? '#0f172a' : '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: isDark ? '#94a3b8' : '#64748b',
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
    backgroundColor: isDark ? '#1e293b' : '#fff',
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
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: isDark ? '#94a3b8' : '#6b7280',
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
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#e2e8f0',
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#f1f5f9' : '#1f2937',
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
    color: isDark ? '#f1f5f9' : '#1f2937',
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
    color: isDark ? '#e2e8f0' : '#111827',
    fontWeight: '600',
  },
  welcomeUsernameTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeUsernameSubtitle: {
    fontSize: 14,
    color: isDark ? '#94a3b8' : '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeUsernameInput: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#e5e7eb',
    color: isDark ? '#e2e8f0' : '#111827',
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
    color: isDark ? '#94a3b8' : '#64748b',
    fontWeight: '500',
  },
  centerMapButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 48,
    height: 48,
    backgroundColor: isDark ? '#1e293b' : '#fff',
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
    backgroundColor: isDark ? '#1e293b' : '#fff',
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
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 10,
  },
  infoHandle: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? '#475569' : '#e2e8f0',
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
    color: isDark ? '#f1f5f9' : '#1e293b',
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
    color: isDark ? '#94a3b8' : '#64748b',
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
    color: isDark ? '#cbd5e1' : '#94a3b8',
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
    backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuDrawer: {
    width: '75%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: isDark ? '#1e293b' : '#fff',
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
    color: isDark ? '#f1f5f9' : '#1f2937',
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
    color: isDark ? '#e2e8f0' : '#1f2937',
  },
  themeSection: {
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  themeSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#94a3b8' : '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  themeSegment: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
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
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
  },
  themeOptionText: {
    color: isDark ? '#cbd5e1' : '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    color: isDark ? '#f1f5f9' : '#111827',
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
    color: isDark ? '#f1f5f9' : '#111827',
  },
  dyslexiaHint: {
    marginTop: 2,
    fontSize: 12,
    color: isDark ? '#94a3b8' : '#64748b',
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
    right: 12,
    zIndex: 10,
    backgroundColor: isDark ? '#1e293b' : '#fff',
    flexDirection: 'row', // La columna de text a l'esquerra, la X a la dreta
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 4,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#e2e8f0',
  },
  filtersColumn: {
    flexDirection: 'column',
    gap: 6, // Espai vertical entre el llamp i el connector
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Espai horitzontal entre la icona i el text
  },
activeFiltersText: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#1f2937',
  },
  clearFilterButton: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1, // Posa una línia fineta que separa els filtres de la X
    borderLeftColor: isDark ? '#334155' : '#e2e8f0',
  },

  // --- Estilos de los componentes de rutas de navegacion ---
  navPanel: {
    position: 'absolute',
    top: 50, // Ajusta según tu TopBar
    left: 20,
    right: 20,
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
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
    color: isDark ? '#f1f5f9' : '#1f2937',
    marginBottom: 4,
  },
  navText: {
    fontSize: 14,
    color: isDark ? '#94a3b8' : '#6b7280',
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
    zIndex: 999, // Para que esté por encima de todo
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
    backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: isDark ? sem.errorTextDark : sem.errorTextLight,
    fontSize: 14,
    flex: 1,
  },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  reportModalCard: {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#111827',
    marginBottom: 4,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#cbd5e1' : '#374151',
  },
  reportTextarea: {
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#d1d5db',
    borderRadius: 10,
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: isDark ? '#e2e8f0' : '#111827',
    textAlignVertical: 'top',
  },
  reportFileButton: {
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportFileButtonText: {
    color: isDark ? '#e2e8f0' : '#1f2937',
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
    borderColor: isDark ? '#475569' : '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: isDark ? '#334155' : '#f8fafc',
  },
  reportTypeChipActive: {
    borderColor: sem.accent,
    backgroundColor: sem.chipActiveBg,
  },
  reportTypeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#cbd5e1' : '#4b5563',
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
    backgroundColor: isDark ? '#334155' : '#f3f4f6',
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportBackButtonText: {
    color: isDark ? '#e2e8f0' : '#374151',
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
