// Inicio (primera pestaña). Sin sesión: bienvenida + Google. Con sesión: menú 3 barras + PANTALLA PRINCIPAL.
import { useState, useEffect, useRef } from 'react';
import { MapView, Marker } from '../_components/MapWrapper';
import TopBar from '../../components/TopBar';

import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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

const LOGO = require('../_assets/favicon.png');
//Importamos el boton de favoritos
import { FavoriteButton } from '../../components/FavoriteButton';

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
}

export default function InicioScreen() {
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

  // --- NOUS ESTATS PEL BUSCADOR ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Estacion[]>([]);
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
          console.log('Sesión creada en backend:', apiResponse.session.id);
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
      setSearchResults([]); // Si hi ha menys de 3 lletres, no busquem
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Construïm els paràmetres de la URL afegint-hi la cerca I ELS FILTRES
        let queryParams = [`q=${encodeURIComponent(searchQuery)}`];

        if (minKw) queryParams.push(`minKw=${minKw}`);
        if (maxKw) queryParams.push(`maxKw=${maxKw}`);
        if (connectorType) queryParams.push(`connectorType=${encodeURIComponent(connectorType)}`);
        if (ac_dc) queryParams.push(`ac_dc=${ac_dc}`);

        // Ajuntem tots els paràmetres amb un "&"
        const queryString = queryParams.join('&');

        // CANVIA AQUESTA URL PER LA TEVA RUTA DE CERCA DEL BACKEND!
        const response = await fetch(`${getApiUrl()}/stations/search?${queryString}`);
        const data = await response.json();

        // --- APLIQUEM EL FILTRE DE FAVORITS LOCALMENT ---
        let resultatsFinals = data;
        if (showFavoritesFilter) {
          resultatsFinals = data.filter((est: Estacion) => favoriteIds.includes(est.id));
        }
        setSearchResults(resultatsFinals);
      } catch (error) {
        console.error('Error cercant estacions:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Espera mig segon després de parar d'escriure

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, minKw, maxKw, connectorType, ac_dc, showFavoritesFilter, favoriteIds]);


  // Funció que s'executa quan toquem un resultat del desplegable
  const handleSelectSearchResult = (station: Estacion) => {
    // 1. Tanquem el buscador i esborrem resultats
    setSearchQuery('');
    setSearchResults([]);

    // 2. Centrem el mapa al punt exacte
    if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
      mapRef.current.animateToRegion({
        latitude: parseFloat(station.latitud),
        longitude: parseFloat(station.longitud),
        latitudeDelta: 0.01, // Més a prop (zoom in)
        longitudeDelta: 0.01,
      }, 1000);
    }

    // 3. Obrim la informació de l'estació seleccionada (la caixeta de baix)
    setSelectedStation(station);
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
      } catch (fetchErr: unknown) {
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
        setUser(data.user);
        setAuthStep('google');
        setPendingAuth(null);
        setWelcomeUsername('');
        return;
      }

      if (data.needsUsername && data.pending_token) {
        setPendingAuth({ pending_token: data.pending_token });
        setAuthStep('username');
      }
    } catch (err: unknown) {
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
    } catch {
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
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'No se pudo iniciar sesión');
        return;
      }
      if (data.user) {
        setUser(data.user);
      }
    } catch {
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

  if (authLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
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
      />

      {/* --- CAIXETA DE FILTRES ACTIUS APILATS --- */}
      {(hasFilters && selectedStation === null ) ? (
        <View style={styles.activeFiltersBadge}>

          {/* Columna esquerra: Llista de filtres */}
          <View style={styles.filtersColumn}>

            {/* Fila de Potència (només es mostra si n'hi ha) */}
            {!!powerText && (
              <View style={styles.filterRow}>
                <MaterialIcons name="bolt" size={18} color="#10b981" />
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
                <MaterialIcons name="ev-station" size={18} color="#10b981" />
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
                <MaterialIcons name="electrical-services" size={18} color="#10b981" />
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
                <MaterialIcons name="favorite" size={18} color="#ef4444" />
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
          key={`map-${displayedStations.length}`} // <-- TRUCO VITAL: Fuerza al mapa a pintarse cuando llegan los datos
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          showsUserLocation={true}
          onPress={() => setSelectedStation(null)}
        >
          {/* Puntos de recarga (Estos sí se agruparán automáticamente) */}
          {displayedStations.map((est) => (
            <Marker
              key={`station-${est.id}`}
              coordinate={{
                latitude: parseFloat(est.latitud),
                longitude: parseFloat(est.longitud),
              }}
              pinColor={favoriteIds.includes(est.id) ? 'red' : 'green'}
              onPress={(e: any) => {
                e.stopPropagation(); // Evita que el toque pase al mapa y cierre el panel
                setSelectedStation(est);
              }}
            />
          ))}
        </MapView>

        {loadingEstaciones && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="small" color="#10b981" />
          </View>
        )}

        {/* Mini panel de información de la estación */}
        {selectedStation && (
          <View style={styles.infoPanel}>
            <View style={styles.infoHandle} />

            <View style={styles.infoTitleRow}>
            <MaterialIcons name="location-on" size={18} color="#10b981" />
              {/* 1. Nombre de la estación */}
              <Text style={styles.infoTitle} numberOfLines={2}>
                {selectedStation.adreca}, {selectedStation.municipi}
              </Text>

              {/* 2. Botón de favoritos (solo si hay usuario) */}
              {user && (
                <FavoriteButton
                  estacio_id={selectedStation.id}
                  isInitiallyFavorite={favoriteIds.includes(selectedStation.id)}
                  onToggle={(isFav) => {
                    if (isFav) {
                      setFavoriteIds([...favoriteIds, selectedStation.id]);
                    } else {
                      setFavoriteIds(favoriteIds.filter(id => id !== selectedStation.id));
                    }
                  }}
                />
              )}

              {/* 3. Botón de cerrar */}
              <TouchableOpacity
                onPress={() => setSelectedStation(null)}
                style={styles.infoCloseBtn}
              >
                <MaterialIcons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>



            {/* CONTENIDO DEL PANEL: Dirección, kW, etc. */}
            <View style={styles.infoContent}>

              <View style={styles.infoBadgeRow}>
                <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
                  <MaterialIcons name="bolt" size={14} color="#10b981" />
                  <Text style={[styles.badgeText, { color: '#047857' }]}>{(parseFloat(selectedStation.kw) != 0)? selectedStation.kw : 'n/a'} kW</Text>
                </View>
              <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
                <MaterialIcons name="ev-station" size={14} color="#10b981" />
                <Text style={[styles.badgeText, { color: '#047857' }]}>{selectedStation.ac_dc}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
                <MaterialIcons name="electrical-services" size={14} color="#10b981" />
                <Text style={[styles.badgeText, { color: '#047857' }]}>{selectedStation.tipus_connexio}</Text>
              </View>

              </View>

              {selectedStation.promotor && (
                <Text style={styles.infoPromotor}>
                  Gestor: {selectedStation.promotor}
                </Text>
              )}
            </View>

            {/* Mostrar timer si está cargando */}
            {isCharging && (
              <View>
                <ChargingTimerDisplay
                  elapsedSeconds={elapsedSeconds}
                  distanceToStation={distanceToStation}
                />
              </View>
            )}

            {/* Mostrar tarjeta de acciones si está cargando */}
            {isCharging && (
              <ChargingActionCard
                isCharging={isCharging}
                elapsedSeconds={elapsedSeconds}
                distanceToStation={distanceToStation}
                onFinishCharging={handleFinishCharging}
                onCancelCharging={handleCancelCharging}
              />
            )}

            {/* Mostrar botón para iniciar carga si no está cargando */}
            {!isCharging && userLocation && (
              <View style={styles.chargingButtonContainer}>
                <StartChargingButton
                  stationId={selectedStation.id}
                  stationLat={parseFloat(selectedStation.latitud)}
                  stationLon={parseFloat(selectedStation.longitud)}
                  userLat={userLocation.coords.latitude}
                  userLon={userLocation.coords.longitude}
                  isCharging={isCharging}
                  onStartCharging={handleStartCharging}
                  onError={(message) => {
                    setChargingError(message);
                    Alert.alert('Error', message);
                  }}
                />
              </View>
            )}

            {/* Mostrar error de carga si existe */}
            {chargingError && (
              <View style={styles.errorMessage}>
                <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{chargingError}</Text>
              </View>
            )}

            {/* Botón de cómo llegar */}
            {!isCharging && (
              <TouchableOpacity
                style={styles.routeButton}
                activeOpacity={0.8}
              >
                <MaterialIcons name="directions" size={20} color="#fff" />
                <Text style={styles.routeButtonText}>Cómo llegar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Modal de resultado de carga */}
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
                  pathname: '/user',
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
              <MaterialIcons name="favorite" size={22} color="#ef4444" />
              <Text style={styles.menuItemText}>Mis Estaciones de Carga</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setMenuOpen(false);
                try {
                  await GoogleSignin.signOut();
                } catch {
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
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
    color: '#1f2937',
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
    color: '#111827',
    fontWeight: '600',
  },
  welcomeUsernameTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeUsernameSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeUsernameInput: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    backgroundColor: '#10b981',
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
    color: '#64748b',
    fontWeight: '500',
  },
  centerMapButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 48,
    height: 48,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 10,
  },
  infoHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
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
    color: '#1e293b',
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
    color: '#64748b',
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
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  routeButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuDrawer: {
    width: '75%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#fff',
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
    color: '#1f2937',
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
    color: '#1f2937',
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
    backgroundColor: '#fff',
    flexDirection: 'row', // La columna de text a l'esquerra, la X a la dreta
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#1f2937',
  },
  clearFilterButton: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1, // Posa una línia fineta que separa els filtres de la X
    borderLeftColor: '#e2e8f0',
  },
  chargingButtonContainer: {
    marginTop: 16,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2', // Un fons vermell claret
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: '#ef4444', // Vermell més fosc pel text
    fontSize: 14,
    flex: 1,
  },
});
