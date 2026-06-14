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
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { appFetch } from '@/services/appFetch';
import { getApiUrl } from '@/constants/api';
import type { ScreenTheme } from '@/constants/screenTheme';
import { useScreenTheme } from '@/hooks/use-screen-theme';
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
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const theme = useScreenTheme();
  const styles = useMemo(() => createFavoriteStyles(theme), [theme.isDark, theme.sem]);

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
        Alert.alert(t('common.error'), t('favorites.loadError'));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert(t('common.error'), t('favorites.connectionError'));
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
      Alert.alert(t('common.attention'), t('favorites.selectOne'));
      return;
    }

    Alert.alert(
      t('favorites.confirmDeleteTitle'),
      selectedIds.size > 1
        ? t('favorites.confirmDeleteMany', { count: selectedIds.size })
        : t('favorites.confirmDeleteOne'),
      [
        { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
        {
          text: t('common.delete'),
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
                Alert.alert(t('common.success'), t('favorites.deletedOk'));
              } else {
                Alert.alert(t('common.error'), t('favorites.partialDelete'));
              }
            } catch (error) {
              console.error('Error removing favorites:', error);
              Alert.alert(t('common.error'), t('favorites.deleteFailed'));
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
              {item.nom || t('home.stationNoName')}
            </Text>
            {Boolean(item.municipi) && (
              <Text style={styles.stationDetail} numberOfLines={1}>
                <MaterialIcons name="location-on" size={14} color={theme.mutedText} /> {item.municipi}
              </Text>
            )}
            {Boolean(item.adreca) && (
              <Text style={styles.stationDetail} numberOfLines={1}>
                {item.adreca}
              </Text>
            )}
            {Boolean(item.kw) && (
              <Text style={styles.stationDetail}>
                <MaterialIcons name="bolt" size={14} color={theme.sem.accent} /> {item.kw} kW
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
            <MaterialIcons name="directions" size={16} color={theme.sem.accent} />
            <Text style={styles.routeBtnText}>{t('favorites.howToArrive')}</Text>
          </TouchableOpacity>

          {/* Botó Cargar Vehículo */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.chargeBtn]}
            onPress={() => handleCargarVehiculo(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="bolt" size={16} color="#fff" />
            <Text style={styles.chargeBtnText}>{t('favorites.charge')}</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.sem.accent} />
          <Text style={styles.loadingText}>{t('favorites.loading')}</Text>
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
          <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('favorites.headerSubtitle', { count: favorites.length })}
          </Text>
        </View>
      </View>

      {/* Contenido Principal */}
      {favorites.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialIcons name="favorite-border" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>{t('favorites.empty')}</Text>
          <Text style={styles.emptySubtext}>{t('favorites.emptyHint')}</Text>
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
                  color={selectedIds.size > 0 ? theme.sem.accent : theme.inputBorder}
                />
                <Text style={styles.selectAllText}>
                  {selectedIds.size === favorites.length
                    ? t('favorites.deselectAll')
                    : t('favorites.selectAll')}
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
                        {t('favorites.remove', { count: selectedIds.size })}
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

const createFavoriteStyles = (theme: ScreenTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.containerBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
    color: theme.title,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.mutedText,
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
    color: theme.mutedText,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.secondaryText,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.mutedText,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // --- NOU CONTENIDOR PRINCIPAL DE LA TARGETA ---
  stationItemWrapper: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  stationItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stationItemSelected: {
    backgroundColor: theme.sem.chipActiveBg,
    borderColor: theme.sem.accent,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.sem.accent,
    borderColor: theme.sem.accent,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.title,
    marginBottom: 6,
  },
  stationDetail: {
    fontSize: 13,
    color: theme.mutedText,
    marginBottom: 4,
  },

  // --- ESTILS DELS NOUS BOTONS ---
  actionButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.chipBg,
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
    borderRightColor: theme.border,
  },
  routeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.sem.accent,
  },
  chargeBtn: {
    backgroundColor: theme.sem.accent,
  },
  chargeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // --- RESTA D'ESTILS ---
  selectionBar: {
    backgroundColor: theme.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: theme.border,
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
    backgroundColor: theme.chipBg,
    borderRadius: 6,
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.secondaryText,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.sem.error,
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