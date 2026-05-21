import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  // Hem tret Linking i Platform ja que no els utilitzarem ara mateix
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { appFetch } from '@/services/appFetch';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { getApiUrl } from '@/constants/api';
import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Station {
  id: number;
  nom: string;
  municipi?: string;
  adreca?: string;
  kw?: string;
  latitud: string;
  longitud: string;
}

export default function MyFavoriteStationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createFavoriteStyles(sem), [sem]);

  // Obtenim els marges de l'àrea segura del mòbil
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await appFetch(`/favorites?usuari_id=${user.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setFavorites(Array.isArray(data) ? data : []);
        setSelectedIds(new Set());
      } else {
        Alert.alert('Error', 'No se pudieron cargar los favoritos');
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === favorites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(favorites.map((f) => f.id)));
    }
  };

  const removeSelected = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Atención', 'Selecciona al menos una estación');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Eliminar ${selectedIds.size} ${selectedIds.size > 1 ? 'estaciones' : 'estación'}?`,
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Eliminar',
          onPress: async () => {
            setDeleting(true);
            try {
              const deletePromises = Array.from(selectedIds).map((estacio_id) =>
                appFetch('/favorites', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ usuari_id: user!.id, estacio_id }),
                })
              );

              const results = await Promise.all(deletePromises);
              const allSuccess = results.every((res) => res.ok);

              if (allSuccess) {
                setFavorites(favorites.filter((f) => !selectedIds.has(f.id)));
                setSelectedIds(new Set());
                Alert.alert('Éxito', 'Estaciones eliminadas correctamente');
              } else {
                Alert.alert('Error', 'Algunas estaciones no se pudieron eliminar');
              }
            } catch (error) {
              console.error('Error removing favorites:', error);
              Alert.alert('Error', 'Error al eliminar estaciones');
            } finally {
              setDeleting(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // --- BOTONS D'ACCIÓ ---

  // Funció per demanar ruta des de la llista de favorits
  const handleStartRoute = (station: Station) => {
    router.navigate({
      pathname: '/', // Això ens porta a la pantalla principal (index.tsx)
      params: {
        action: 'start_route_from_fav',
        destLat: station.latitud,
        destLng: station.longitud,
      }
    });
  };

  const handleCargarVehiculo = (station: Station) => {
    // Redirigim al mapa principal passant la cerca exacta
    // Això farà que el mapa s'obri, centri l'estació i obri el panell directament.
    router.push({
      pathname: '/',
      params: {
        autoSelectStationId: station.id.toString()
      }
    });
  };

  const renderStationItem = ({ item }: { item: Station }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <View style={[styles.stationItemWrapper, isSelected && styles.stationItemSelected]}>
        <TouchableOpacity
          style={styles.stationItemTop}
          onPress={() => toggleSelect(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && (
                <MaterialIcons name="check" size={16} color="#fff" />
              )}
            </View>
          </View>

          <View style={styles.stationInfo}>
            <Text style={styles.stationName} numberOfLines={1}>
              {item.nom || 'Estación sin nombre'}
            </Text>
            {item.municipi && (
              <Text style={styles.stationDetail} numberOfLines={1}>
                <MaterialIcons name="location-on" size={14} color="#64748b" /> {item.municipi}
              </Text>
            )}
            {item.adreca && (
              <Text style={styles.stationDetail} numberOfLines={1}>
                {item.adreca}
              </Text>
            )}
            {item.kw && (
              <Text style={styles.stationDetail}>
                <MaterialIcons name="bolt" size={14} color={sem.accent} /> {item.kw} kW
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* --- FILA DE BOTONS D'ACCIÓ --- */}
        <View style={styles.actionButtonsRow}>
          {/* Botó Cómo Llegar */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.routeBtn]}
            onPress={() => handleStartRoute(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="directions" size={16} color={sem.accent} />
            <Text style={styles.routeBtnText}>Cómo llegar</Text>
          </TouchableOpacity>

          {/* Botó Cargar Vehículo */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.chargeBtn]}
            onPress={() => handleCargarVehiculo(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="bolt" size={16} color="#fff" />
            <Text style={styles.chargeBtnText}>Cargar</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={sem.accent} />
          <Text style={styles.loadingText}>Cargando estaciones...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          hitSlop={10}
        >
          <MaterialIcons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Mis Estaciones de Carga</Text>
          <Text style={styles.headerSubtitle}>
            {favorites.length} {favorites.length !== 1 ? 'estaciones' : 'estación'}
          </Text>
        </View>
      </View>

      {/* Contenido Principal */}
      {favorites.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialIcons name="favorite-border" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>No tienes estaciones favoritas</Text>
          <Text style={styles.emptySubtext}>
            Añade estaciones a favoritos desde el mapa
          </Text>
        </View>
      ) : (
        <>
          {/* Lista de Estaciones */}
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderStationItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />

          {/* Barra de Selección */}
          {favorites.length > 0 && (
            <View style={styles.selectionBar}>
              <TouchableOpacity
                onPress={toggleSelectAll}
                style={styles.selectAllButton}
              >
                <MaterialIcons
                  name={
                    selectedIds.size === favorites.length
                      ? 'done-all'
                      : 'done'
                  }
                  size={20}
                  color={selectedIds.size > 0 ? sem.accent : '#cbd5e1'}
                />
                <Text style={styles.selectAllText}>
                  {selectedIds.size === favorites.length
                    ? 'Deseleccionar todo'
                    : 'Seleccionar todo'}
                </Text>
              </TouchableOpacity>

              {selectedIds.size > 0 && (
                <TouchableOpacity
                  onPress={removeSelected}
                  disabled={deleting}
                  style={[styles.removeButton, deleting && styles.removeButtonDisabled]}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="delete" size={20} color="#fff" />
                      <Text style={styles.removeButtonText}>
                        Eliminar ({selectedIds.size})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const createFavoriteStyles = (sem: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // --- NOU CONTENIDOR PRINCIPAL DE LA TARGETA ---
  stationItemWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  stationItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stationItemSelected: {
    backgroundColor: sem.chipActiveBg,
    borderColor: sem.accent,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: sem.accent,
    borderColor: sem.accent,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  stationDetail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },

  // --- ESTILS DELS NOUS BOTONS ---
  actionButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  routeBtn: {
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  routeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: sem.accent,
  },
  chargeBtn: {
    backgroundColor: sem.accent,
  },
  chargeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // --- RESTA D'ESTILS ---
  selectionBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: sem.error,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    gap: 6,
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});