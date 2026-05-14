import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';

import { FavoriteButton } from './FavoriteButton';
import { StarRating } from './StarRating';
import { getStationReviews, addStationReview, deleteStationReview, updateStationReview, toggleReviewLike, Review } from '@/services/reviewsApiService';
import { useAuth } from '@/contexts/AuthContext';

// Importació de les constants de tema i el hook de color
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// Importem els components de càrrega
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
  onOpenIncidenciaForm: () => void;
  onSolvedIncidencia: () => void;
}

export const StationBottomSheet: React.FC<StationBottomSheetProps> = ({
  station, onClose, isFavorite, onToggleFavorite,
  userLocation, isCharging, elapsedSeconds, distanceToStation,
  onStartCharging, onFinishCharging, onCancelCharging,
  chargingError, setChargingError, onStartNavigation,
  onOpenIncidenciaForm, onSolvedIncidencia
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);
  const { user } = useAuth();

  // Lògica per detectar el tema actual
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
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
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para valorar los comentarios.');
      return;
    }
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
      await toggleReviewLike(review.id, user.token || '');
    } catch (error) {
      setReviews(originalReviews);
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
      setRating(0);
      setComment('');
      setEditingReviewId(null);
      setIsFormVisible(false);
      await fetchReviews();
    } catch (error) {
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
            await deleteStationReview(reviewId, user?.token || '');
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
    bottomSheetRef.current?.snapToIndex(2);
  };

  const cancelForm = () => {
    setEditingReviewId(null);
    setRating(0);
    setComment('');
    setIsFormVisible(false);
  };

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
      handleIndicatorStyle={{ backgroundColor: isDark ? '#94a3b8' : '#cbd5e1' }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>

        {/* --- INFO ESTACIÓ --- */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>{station.adreca}, {station.municipi}</Text>
          {user && (
            <FavoriteButton estacio_id={station.id} isInitiallyFavorite={isFavorite} onToggle={onToggleFavorite} />
          )}
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <MaterialIcons name="bolt" size={14} color={isDark ? "#34d399" : "#10b981"} />
            <Text style={styles.badgeText}>{(parseFloat(station.kw) !== 0)? station.kw : 'n/a'} kW</Text>
          </View>
          <View style={styles.badge}>
            <MaterialIcons name="ev-station" size={14} color={isDark ? "#34d399" : "#10b981"} />
            <Text style={styles.badgeText}>{station.ac_dc}</Text>
          </View>
          <View style={styles.badge}>
            <MaterialIcons name="electrical-services" size={14} color={isDark ? "#34d399" : "#10b981"} />
            <Text style={styles.badgeText}>{station.tipus_connexio}</Text>
          </View>
        </View>

        {station.promotor && (
          <Text style={styles.infoPromotor}>Gestor: {station.promotor}</Text>
        )}

        {/* --- ACCIONS (CÀRREGA + INCIDÈNCIES) --- */}
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
                onError={(msg) => {
                  setChargingError(msg);
                  Alert.alert('Error', msg);
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
            station.operatiu === false ? (
              <TouchableOpacity
                style={[styles.routeButton, { backgroundColor: isDark ? '#2563eb' : '#3b82f6' }]}
                onPress={onSolvedIncidencia}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.routeButtonText}>Reportar incidencia solucionada</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.routeButton, { backgroundColor: isDark ? '#b45309' : '#f59e0b' }]}
                onPress={onOpenIncidenciaForm}
              >
                <MaterialIcons name="report-problem" size={20} color="#fff" />
                <Text style={styles.routeButtonText}>Reportar incidencia</Text>
              </TouchableOpacity>
            )
          )}

          {!isCharging && (
            <TouchableOpacity
              style={styles.routeButton}
              onPress={() => onStartNavigation({ latitude: parseFloat(station.latitud), longitude: parseFloat(station.longitud) })}
            >
              <MaterialIcons name="directions" size={20} color="#fff" />
              <Text style={styles.routeButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* --- RESSENYES --- */}
        <View style={styles.reviewsHeaderContainer}>
          <View style={styles.reviewsHeaderLeft}>
            <Text style={styles.sectionTitle}>Valoraciones</Text>
            {averageRating && (
              <View style={styles.averageContainer}>
                <Text style={styles.averageText}>{averageRating}</Text>
                <MaterialIcons name="star" size={20} color="#f59e0b" />
              </View>
            )}
          </View>

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

        {isFormVisible && user && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{editingReviewId ? 'Edita tu opinión' : 'Deja tu opinión'}</Text>
            <StarRating rating={rating} onRatingChange={setRating} disabled={false} size={32} />
            <TextInput
              style={styles.textInput}
              placeholder="Escribe tu comentario..."
              placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Publicar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop: 12}} onPress={cancelForm}>
                <Text style={{color: isDark ? '#94a3b8' : '#6b7280', textAlign: 'center'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!user && !isFormVisible && (
          <Text style={styles.loginPrompt}>Inicia sesión para dejar una valoración.</Text>
        )}

        {loadingReviews ? (
          <ActivityIndicator style={{marginTop: 20}} color={isDark ? '#fff' : '#10b981'} />
        ) : reviews.length === 0 ? (
          <Text style={styles.noReviewsText}>Aún no hay valoraciones. ¡Sé el primero!</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{review.username}</Text>
                  <Text style={styles.reviewDate}>
                    • {new Date(review.data_publicacio).toLocaleDateString()}
                    {review.data_actualitzacio !== review.data_publicacio && ' (Editado)'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.likeButtonHeader} onPress={() => handleToggleLike(review)}>
                  <Text style={[styles.likeCount, review.user_has_liked && {color: '#ef4444'}]}>{review.likes_count}</Text>
                  <MaterialIcons name={review.user_has_liked ? "favorite" : "favorite-border"} size={20} color={review.user_has_liked ? "#ef4444" : (isDark ? "#64748b" : "#94a3b8")} />
                </TouchableOpacity>
              </View>
              <StarRating rating={review.puntuacio} size={16} />
              {review.comentari ? <Text style={styles.reviewComment}>{review.comentari}</Text> : null}
              {user?.id === review.usuari_id && (
                <View style={styles.reviewActions}>
                  <TouchableOpacity onPress={() => startEditing(review)}><Text style={styles.actionTextBlue}>Editar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteReview(review.id)}><Text style={styles.actionTextRed}>Eliminar</Text></TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// Funció que genera els estils basant-se en el tema de TopBar i index
const createStyles = (isDark: boolean) => StyleSheet.create({
  bottomSheetBackground: {
    borderRadius: 24,
    elevation: 10,
    backgroundColor: isDark ? '#1e293b' : Colors.light.background // Color unificat amb el desplegable de TopBar
  },
  contentContainer: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: isDark ? Colors.dark.text : Colors.light.text, flex: 1, marginRight: 10 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { backgroundColor: isDark ? '#334155' : '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { color: isDark ? '#94a3b8' : '#047857', fontWeight: '600', fontSize: 12 },
  infoPromotor: { fontSize: 12, color: isDark ? '#94a3b8' : '#94a3b8', fontStyle: 'italic', marginBottom: 16 },
  actionsContainer: { gap: 12, marginTop: 10 },
  chargingButtonContainer: { marginTop: 4 },
  routeButton: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  routeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#450a0a' : '#fee2e2', padding: 12, borderRadius: 8, gap: 8 },
  errorText: { color: isDark ? '#fca5a5' : '#ef4444', fontSize: 14, flex: 1 },
  divider: { height: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0', marginVertical: 24 },

  // Secció Valoracions corregida
  reviewsHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reviewsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: isDark ? Colors.dark.text : '#1e293b' },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#334155' : '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#fef3c7'
  },
  averageText: { fontSize: 16, fontWeight: '700', color: isDark ? '#fcd34d' : '#b45309', marginRight: 2 },
  addReviewFab: {
    backgroundColor: '#10b981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width:0, height:2},
    shadowOpacity: 0.2,
    shadowRadius: 2
  },

  formContainer: { backgroundColor: isDark ? '#334155' : '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: isDark ? '#475569' : '#f1f5f9' },
  formTitle: { fontSize: 14, fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569', marginBottom: 8 },
  textInput: {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#e2e8f0',
    color: isDark ? Colors.dark.text : Colors.light.text,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  submitButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '700' },
  loginPrompt: { color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic', marginBottom: 20 },
  noReviewsText: { color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 10 },

  reviewCard: { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f1f5f9', paddingVertical: 16 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewerName: { fontWeight: '600', color: isDark ? Colors.dark.text : '#1e293b' },
  reviewDate: { fontSize: 12, color: isDark ? '#94a3b8' : '#94a3b8' },
  likeButtonHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10 },
  likeCount: { fontSize: 14, color: isDark ? '#cbd5e1' : '#64748b', fontWeight: '600' },
  reviewComment: { marginTop: 8, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 20 },
  reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  actionTextBlue: { color: isDark ? '#60a5fa' : '#3b82f6', fontSize: 14, fontWeight: '600' },
  actionTextRed: { color: isDark ? '#f87171' : '#ef4444', fontSize: 14, fontWeight: '600' },
});