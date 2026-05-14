import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';

import { FavoriteButton } from './FavoriteButton';
import { StarRating } from './StarRating';
import { getStationReviews, addStationReview, deleteStationReview, updateStationReview, toggleReviewLike, Review } from '@/services/reviewsApiService';
import { useAuth } from '@/contexts/AuthContext';

// Importamos los componentes de carga
import { ChargingTimerDisplay } from './ChargingTimerDisplay';
import { ChargingActionCard } from './ChargingActionCard';
import { StartChargingButton } from './StartChargingButton';

interface StationBottomSheetProps {
  station: any;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (isFav: boolean) => void;
  userLocation: Location.LocationObject | null;
  isCharging: boolean;
  elapsedSeconds: number;
  distanceToStation: number | null;
  onStartCharging: () => Promise<boolean>;
  onFinishCharging: () => void;
  onCancelCharging: () => void;
  chargingError: string;
  setChargingError: (msg: string) => void;
  onStartNavigation: (coords: {latitude: number, longitude: number}) => void;
}

export const StationBottomSheet: React.FC<StationBottomSheetProps> = ({
  station, onClose, isFavorite, onToggleFavorite,
  userLocation, isCharging, elapsedSeconds, distanceToStation,
  onStartCharging, onFinishCharging, onCancelCharging,
  chargingError, setChargingError, onStartNavigation
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  // Reducimos el tope máximo al 85% para que no choque con el menú superior
  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // Nuevo estado para mostrar/ocultar el formulario de reseñas
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (station) fetchReviews();
  }, [station]);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const data = await getStationReviews(station.id, user?.id);
      setReviews(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleToggleLike = async (review: Review) => {
    if (!user) {
      Alert.alert('Inicia sessió', 'Has d\'iniciar sessió per valorar els comentaris.');
      return;
    }

    // 1. Canviem l'estat local INSTANTÀNIAMENT per la millor UX
    const originalReviews = [...reviews];
    setReviews(reviews.map(r => {
      if (r.id === review.id) {
        return {
          ...r,
          user_has_liked: !r.user_has_liked,
          likes_count: r.user_has_liked ? r.likes_count - 1 : r.likes_count + 1
        };
      }
      return r;
    }));

    try {
      // 2. Avisem al backend en segon pla
      await toggleReviewLike(review.id, user.token || '');
    } catch (error) {
      // 3. Si falla la xarxa, revertim el botó com estava
      setReviews(originalReviews);
      console.error(error);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) return Alert.alert('Error', 'Por favor, selecciona una puntuación.');
    setIsSubmitting(true);
    try {
      const token = user?.token || '';
      if (editingReviewId) {
        await updateStationReview(editingReviewId, rating, comment, token);
      } else {
        await addStationReview(station.id, rating, comment, token);
      }
      // Limpiamos y cerramos el formulario tras éxito
      setRating(0);
      setComment('');
      setEditingReviewId(null);
      setIsFormVisible(false);
      await fetchReviews();
    } catch (error) {
      console.error("ERROR REAL DEL FRONTEND:", error);
      Alert.alert('Error', 'Ha habido un problema guardando la valoración.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = (reviewId: number) => {
    Alert.alert('Eliminar valoración', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            const token = user?.token || '';
            await deleteStationReview(reviewId, token);
            await fetchReviews();
          } catch (error) {
            Alert.alert('Error', 'No se ha podido eliminar.');
          }
      }}
    ]);
  };

  const startEditing = (review: Review) => {
    setEditingReviewId(review.id);
    setRating(review.puntuacio);
    setComment(review.comentari || '');
    setIsFormVisible(true);
    bottomSheetRef.current?.snapToIndex(2); // Sube el panel para que se vea el teclado
  };

  const cancelForm = () => {
    setEditingReviewId(null);
    setRating(0);
    setComment('');
    setIsFormVisible(false);
  };

  // Calcular la media de las valoraciones
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, rev) => acc + rev.puntuacio, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>

        {/* --- PARTE 1: INFORMACIÓN DE LA ESTACIÓN --- */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>{station.adreca}, {station.municipi}</Text>
          {user && (
            <FavoriteButton estacio_id={station.id} isInitiallyFavorite={isFavorite} onToggle={onToggleFavorite} />
          )}
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <MaterialIcons name="bolt" size={14} color="#10b981" />
            <Text style={styles.badgeText}>{(parseFloat(station.kw) !== 0)? station.kw : 'n/a'} kW</Text>
          </View>
          <View style={styles.badge}>
            <MaterialIcons name="ev-station" size={14} color="#10b981" />
            <Text style={styles.badgeText}>{station.ac_dc}</Text>
          </View>
          <View style={styles.badge}>
            <MaterialIcons name="electrical-services" size={14} color="#10b981" />
            <Text style={styles.badgeText}>{station.tipus_connexio}</Text>
          </View>
        </View>

        {station.promotor && (
          <Text style={styles.infoPromotor}>Gestor: {station.promotor}</Text>
        )}

        {/* --- PARTE 2: ACCIONES (CARGA Y NAVEGACIÓN) --- */}
        <View style={styles.actionsContainer}>
          {isCharging && (
            <View>
              <ChargingTimerDisplay elapsedSeconds={elapsedSeconds} distanceToStation={distanceToStation} />
              <ChargingActionCard
                isCharging={isCharging}
                elapsedSeconds={elapsedSeconds}
                distanceToStation={distanceToStation}
                onFinishCharging={onFinishCharging}
                onCancelCharging={onCancelCharging}
              />
            </View>
          )}

          {!isCharging && userLocation && (
            <View style={styles.chargingButtonContainer}>
              <StartChargingButton
                stationId={station.id}
                stationLat={parseFloat(station.latitud)}
                stationLon={parseFloat(station.longitud)}
                userLat={userLocation.coords.latitude}
                userLon={userLocation.coords.longitude}
                isCharging={isCharging}
                onStartCharging={onStartCharging}
                onError={(message) => {
                  setChargingError(message);
                  Alert.alert('Error', message);
                }}
              />
            </View>
          )}

          {chargingError ? (
            <View style={styles.errorMessage}>
              <MaterialIcons name="error-outline" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{chargingError}</Text>
            </View>
          ) : null}

          {!isCharging && (
            <TouchableOpacity
              style={styles.routeButton}
              activeOpacity={0.8}
              onPress={() => onStartNavigation({
                latitude: parseFloat(station.latitud),
                longitude: parseFloat(station.longitud)
              })}
            >
              <MaterialIcons name="directions" size={20} color="#fff" />
              <Text style={styles.routeButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* --- PARTE 3: VALORACIONES --- */}

        {/* Cabecera de reseñas con el diseño solicitado */}
        <View style={styles.reviewsHeaderContainer}>
          <View style={styles.reviewsHeaderLeft}>
            <Text style={styles.sectionTitle}>Valoraciones</Text>
            {averageRating && (
              <View style={styles.averageContainer}>
                <Text style={styles.averageText}>{averageRating}</Text>
                <MaterialIcons name="star" size={22} color="#f59e0b" />
              </View>
            )}
          </View>

          {/* Botón flotante redondo para añadir, si no está el formulario abierto y es usuario */}
          {user && !isFormVisible && (
            <TouchableOpacity
              style={styles.addReviewFab}
              activeOpacity={0.8}
              onPress={() => setIsFormVisible(true)}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Formulario (Desplegable) */}
        {isFormVisible && user && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{editingReviewId ? 'Edita tu opinión' : 'Deja tu opinión'}</Text>
            <StarRating rating={rating} onRatingChange={setRating} disabled={false} size={32} />
            <TextInput
              style={styles.textInput}
              placeholder="Escribe tu comentario..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Publicar</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={{marginTop: 12}} onPress={cancelForm}>
                <Text style={{color: '#6b7280', textAlign: 'center'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Aviso si no hay usuario (solo si el formulario tampoco está visible) */}
        {!user && !isFormVisible && (
          <Text style={styles.loginPrompt}>Inicia sesión para dejar una valoración.</Text>
        )}

        {/* Lista de reseñas */}
        {loadingReviews ? (
          <ActivityIndicator style={{marginTop: 20}} />
        ) : reviews.length === 0 ? (
          <Text style={styles.noReviewsText}>Aún no hay valoraciones. ¡Sé el primero!</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              {/* CAPÇALERA: Nom + Data (Esquerra) | Likes (Dreta) */}
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{review.username}</Text>
                  <Text style={styles.reviewDate}>
                    • {new Date(review.data_publicacio).toLocaleDateString()}
                    {review.data_actualitzacio !== review.data_publicacio && ' (Editado)'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.likeButtonHeader}
                  activeOpacity={0.7}
                  onPress={() => handleToggleLike(review)}
                >
                  <Text style={[styles.likeCount, review.user_has_liked && {color: '#ef4444'}]}>
                    {review.likes_count}
                  </Text>
                  <MaterialIcons
                    name={review.user_has_liked ? "favorite" : "favorite-border"}
                    size={20}
                    color={review.user_has_liked ? "#ef4444" : "#94a3b8"}
                  />
                </TouchableOpacity>
              </View>

              {/* ESTRELLES I COMENTARI */}
              <StarRating rating={review.puntuacio} size={16} />
              {review.comentari ? <Text style={styles.reviewComment}>{review.comentari}</Text> : null}

              {/* ACCIONS: Editar i Eliminar (Només si és el propietari) */}
              {user && user.id === review.usuari_id && (
                <View style={styles.reviewActions}>
                  <TouchableOpacity onPress={() => startEditing(review)}>
                    <Text style={styles.actionTextBlue}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteReview(review.id)}>
                    <Text style={styles.actionTextRed}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: { borderRadius: 24, elevation: 10 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 10 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { color: '#047857', fontWeight: '600', fontSize: 12 },
  infoPromotor: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 16 },

  actionsContainer: { gap: 12, marginTop: 10 },
  chargingButtonContainer: { marginTop: 4 },
  routeButton: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  routeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, gap: 8 },
  errorText: { color: '#ef4444', fontSize: 14, flex: 1 },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 24 },

  // Nuevos estilos de la cabecera de reseñas
  reviewsHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reviewsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' }, // Quitado el marginBottom original
  averageContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#fef3c7' },
  averageText: { fontSize: 16, fontWeight: '700', color: '#b45309', marginRight: 2 },
  addReviewFab: { backgroundColor: '#10b981', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.2, shadowRadius: 2 },

  formContainer: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  formTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#475569' },
  textInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginTop: 12, minHeight: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '700' },
  loginPrompt: { color: '#64748b', fontStyle: 'italic', marginBottom: 20 },
  noReviewsText: { color: '#64748b', textAlign: 'center', marginTop: 10 },

  // --- ESTILS DE LES RESSENYES ---
    reviewCard: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 16 },

    // Capçalera (Fila superior)
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 }, // Agrupa el nom i la data
    reviewerName: { fontWeight: '600', color: '#1e293b' },
    reviewDate: { fontSize: 12, color: '#94a3b8' },

    // Botó de Likes a dalt a la dreta
    likeButtonHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10 },
    likeCount: { fontSize: 14, color: '#64748b', fontWeight: '600' },

    // Comentari
    reviewComment: { marginTop: 8, color: '#475569', lineHeight: 20 },

    // Botons Editar/Eliminar
    reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
    actionTextBlue: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
    actionTextRed: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  });