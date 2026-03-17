// Inicio (primera pestaña). Sin sesión: bienvenida + Google. Con sesión: menú 3 barras + PANTALLA PRINCIPAL.
import { useState, useEffect, useRef } from 'react';
import { MapView, Marker } from '../../components/MapWrapper';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';

import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/constants/api';

const LOGO = require('../_assets/favicon.png');

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
  const connectorType = params.connectorType as string | undefined;
  const ac_dc = params.ac_dc as string | undefined;

  const { user, logout, isLoading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loadingEstaciones, setLoadingEstaciones] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Estacion | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  // Estado para controlar la región visible del mapa
  const [region, setRegion] = useState({
    latitude: 41.3879,
    longitude: 2.16992,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const mapRef = useRef<any>(null);

  // Cargar estaciones de la base de datos cada vez que cambian filtros o región
  useEffect(() => {
    if (user) {
      fetchEstaciones();
    }
  }, [user, minKw, maxKw, connectorType, ac_dc, region]);

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

  const fetchEstaciones = async () => {
    setLoadingEstaciones(true);
    try {
      // Calculamos límites del Viewport para el filtrado en Backend
      const north = region.latitude + region.latitudeDelta / 2;
      const south = region.latitude - region.latitudeDelta / 2;
      const east = region.longitude + region.longitudeDelta / 2;
      const west = region.longitude - region.longitudeDelta / 2;

      // Construimos los parámetros de la URL unificados
      let queryParams = [
        `north=${north}`,
        `south=${south}`,
        `east=${east}`,
        `west=${west}`
      ];

      if (minKw) queryParams.push(`minKw=${minKw}`);
      if (maxKw) queryParams.push(`maxKw=${maxKw}`);
      if (connectorType) queryParams.push(`connectorType=${encodeURIComponent(connectorType)}`);
      if (ac_dc) queryParams.push(`ac_dc=${ac_dc}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const url = `${API_URL}/stations${queryString}`;

      const response = await fetch(url);
      const data = await response.json();

      // Seguridad: aseguramos que data sea una lista antes de guardarla
      setEstaciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando estaciones:', error);
      setEstaciones([]); // Si falla la red, vaciamos para evitar errores de .map()
    } finally {
      setLoadingEstaciones(false);
    }
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion);
  };

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

  // --- LÒGICA PEL TEXT DELS FILTRES ---
  let powerText = '';
  if (minKw && maxKw) {
    powerText = `${minKw} - ${maxKw} kW`;
  } else if (minKw) {
    powerText = `≥ ${minKw} kW`;
  } else if (maxKw) {
    powerText = `≤ ${maxKw} kW`;
  }

  const hasFilters = !!minKw || !!maxKw || !!connectorType || !!ac_dc;

  if (authLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Cargando…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Bienvenido a e-Go</Text>
            <Text style={styles.subtitle}>
              Tu navegador de estaciones de carga en Catalunya
            </Text>
            <TouchableOpacity
              style={styles.adminLink}
              onPress={() => router.push('/admin-login')}
              activeOpacity={0.8}
            >
              <Text style={styles.adminLinkText}>Acceso Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push({ pathname: '/login', params: { openGoogle: '1' } })}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.loginButtonText}>Continuar con Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMenuOpen(true)}
        activeOpacity={0.8}
      >
        <View style={styles.menuBar} />
        <View style={styles.menuBar} />
        <View style={styles.menuBar} />
      </TouchableOpacity>

      {/* --- CAIXETA DE FILTRES ACTIUS APILATS --- */}
      {hasFilters && (
        <View style={styles.activeFiltersBadge}>

          {/* Columna esquerra: Llista de filtres */}
          <View style={styles.filtersColumn}>

            {/* Fila de Potència (només es mostra si n'hi ha) */}
            {!!powerText && (
              <View style={styles.filterRow}>
                <MaterialIcons name="bolt" size={18} color="#10b981" />
                <Text style={styles.activeFiltersText}>{powerText}</Text>
              </View>
            )}

            {/* Fila de AC/DC (només es mostra si n'hi ha) */}
            {!!ac_dc && (
              <View style={styles.filterRow}>
                <MaterialIcons name="ev-station" size={18} color="#10b981" />
                <Text style={styles.activeFiltersText}>
                  {ac_dc === 'AC' ? 'AC' : ac_dc === 'DC' ? 'DC' : ac_dc}
                </Text>
              </View>
            )}

            {/* Fila de Connector (només es mostra si n'hi ha) */}
            {!!connectorType && (
              <View style={styles.filterRow}>
                <MaterialIcons name="electrical-services" size={18} color="#10b981" />
                <Text style={styles.activeFiltersText}>{connectorType}</Text>
              </View>
            )}

          </View>

          {/* Columna dreta: Botó de tancar */}
          <TouchableOpacity
            onPress={() => router.setParams({ minKw: '', maxKw: '', connectorType: '', ac_dc: '' })}
            hitSlop={8}
            style={styles.clearFilterButton}
          >
            <MaterialIcons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>

        </View>
      )}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          onPress={() => setSelectedStation(null)}
        >
          {userLocation && ( //marcamos la ubi del user manualmente en la web (showsUserLocation no sirve aqui)
            <Marker
              coordinate={{
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
              }}
              title="Tu ubicación"
              options={{
                icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              }}
              //(por si acaso el showsUserLocation falla)
              pinColor="blue"
            />
          )}

          {estaciones.map((est) => (
            <Marker
              key={est.id}
              coordinate={{
                latitude: parseFloat(est.latitud),
                longitude: parseFloat(est.longitud),
              }}
              onPress={(e: any) => {
                e.stopPropagation();
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

        {/* Botón para centrar en el usuario */}
        {userLocation && (
          <TouchableOpacity
            style={styles.centerMapButton}
            onPress={centerMapOnUser}
            activeOpacity={0.8}>
            <MaterialIcons name="my-location" size={24} color="#1f2937" />
          </TouchableOpacity>
        )}

        {/* Mini panel de información de la estación */}
        {selectedStation && (
          <View style={styles.infoPanel}>
            <View style={styles.infoHandle} />
            <View style={styles.infoTitleRow}>
            <MaterialIcons name="location-on" size={18} color="#10b981" />
              <Text style={styles.infoTitle} numberOfLines={2}>
                {selectedStation.adreca}, {selectedStation.municipi}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedStation(null)}
                style={styles.infoCloseBtn}
              >
                <MaterialIcons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoContent}>

              <View style={styles.infoBadgeRow}>
                <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
                  <MaterialIcons name="bolt" size={14} color="#10b981" />
                  <Text style={[styles.badgeText, { color: '#047857' }]}>{(selectedStation.kw != 0)? selectedStation.kw : 'n/a'} kW</Text>
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

            <TouchableOpacity
              style={styles.routeButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="directions" size={20} color="#fff" />
              <Text style={styles.routeButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          </View>
        )}
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
                    connectorType: connectorType || '',
                    ac_dc: ac_dc || '',
                  }
                });
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="filter-list" size={22} color="#1f2937" />
              <Text style={styles.menuItemText}>Añadir Filtros</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
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
  logo: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
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
  adminLink: {
    marginBottom: 16,
  },
  adminLinkText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  menuButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 10,
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 3,
  },
  centerMapButton: {
    position: 'absolute',
    top: 48,
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
  menuBar: {
    width: 22,
    height: 2.5,
    backgroundColor: '#1f2937',
    borderRadius: 2,
  },
  mapContainer: {
    flex: 1,
  },
  mapLoading: {
    position: 'absolute',
    top: 60,
    right: 24,
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
    top: 110,
    right: 16,
    zIndex: 10,
    backgroundColor: '#fff',
    flexDirection: 'row', // La columna de text a l'esquerra, la X a la dreta
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
});