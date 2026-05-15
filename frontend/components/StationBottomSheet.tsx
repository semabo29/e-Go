import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { FavoriteButton } from './FavoriteButton';
import { StarRating } from './StarRating';
import {
  getStationReviews,
  addStationReview,
  deleteStationReview,
  updateStationReview,
  toggleReviewLike,
  type Review,
} from '@/services/reviewsApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ChargingTimerDisplay } from './ChargingTimerDisplay';
import { ChargingActionCard } from './ChargingActionCard';
import { StartChargingButton } from './StartChargingButton';
import { StationNearbyEventsCarousel } from './StationNearbyEventsCarousel';

type SheetStyles = ReturnType<typeof createStyles>;

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
  onStartNavigation: (coords: { latitude: number; longitude: number }) => void;
  onOpenIncidenciaForm: () => void;
  onSolvedIncidencia: () => void;
  onFocusEventOnMap?: (
    eventLat: number,
    eventLon: number,
    title: string,
    stationOriginLat: number,
    stationOriginLon: number
  ) => void;
}

function getStationCoordinates(station: { latitud: string; longitud: string }) {
  return {
    latitude: Number.parseFloat(String(station.latitud)),
    longitude: Number.parseFloat(String(station.longitud)),
  };
}

function formatStationKw(kw: string | number): string {
  const value = Number.parseFloat(String(kw));
  return value === 0 ? 'n/a' : String(kw);
}

function getIncidentButtonBackgroundColor(isOutOfService: boolean, isDark: boolean): string {
  if (isOutOfService) {
    return isDark ? '#2563eb' : '#3b82f6';
  }
  return isDark ? '#b45309' : '#f59e0b';
}

function getReviewLikeIconColor(userHasLiked: boolean, isDark: boolean): string {
  if (userHasLiked) return '#ef4444';
  return isDark ? '#64748b' : '#94a3b8';
}

function computeAverageRating(reviews: Review[]): string | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, rev) => acc + rev.puntuacio, 0);
  return (sum / reviews.length).toFixed(1);
}

function useStationReviews(stationId: number, userId: number | undefined, userToken: string | undefined, t: TFunction) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const data = await getStationReviews(stationId, userId);
      setReviews(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingReviews(false);
    }
  }, [stationId, userId]);

  useEffect(() => {
    fetchReviews().catch(() => undefined);
  }, [fetchReviews]);

  const handleToggleLike = useCallback(
    async (review: Review) => {
      if (!userToken) {
        Alert.alert(t('stationSheet.likeLoginTitle'), t('stationSheet.likeLoginBody'));
        return;
      }
      const originalReviews = [...reviews];
      setReviews(
        reviews.map((r) =>
          r.id === review.id
            ? {
                ...r,
                user_has_liked: !r.user_has_liked,
                likes_count: r.user_has_liked ? r.likes_count - 1 : r.likes_count + 1,
              }
            : r
        )
      );
      try {
        await toggleReviewLike(review.id, userToken);
      } catch {
        setReviews(originalReviews);
      }
    },
    [reviews, userToken, t]
  );

  const handleSubmitReview = useCallback(async () => {
    if (rating === 0) {
      Alert.alert(t('stationSheet.ratingRequiredTitle'), t('stationSheet.ratingRequiredBody'));
      return;
    }
    setIsSubmitting(true);
    try {
      const token = userToken || '';
      if (editingReviewId) {
        await updateStationReview(editingReviewId, rating, comment, token);
      } else {
        await addStationReview(stationId, rating, comment, token);
      }
      setRating(0);
      setComment('');
      setEditingReviewId(null);
      setIsFormVisible(false);
      await fetchReviews();
    } catch {
      Alert.alert(t('common.error'), t('stationSheet.saveReviewError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, comment, editingReviewId, userToken, stationId, fetchReviews, t]);

  const handleDeleteReview = useCallback(
    (reviewId: number) => {
      Alert.alert(t('stationSheet.deleteReviewTitle'), t('stationSheet.deleteReviewBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStationReview(reviewId, userToken || '');
              await fetchReviews();
            } catch {
              Alert.alert(t('common.error'), t('stationSheet.deleteReviewError'));
            }
          },
        },
      ]);
    },
    [userToken, fetchReviews, t]
  );

  const startEditing = useCallback((review: Review) => {
    setEditingReviewId(review.id);
    setRating(review.puntuacio);
    setComment(review.comentari || '');
    setIsFormVisible(true);
  }, []);

  const cancelForm = useCallback(() => {
    setEditingReviewId(null);
    setRating(0);
    setComment('');
    setIsFormVisible(false);
  }, []);

  return {
    reviews,
    loadingReviews,
    rating,
    setRating,
    comment,
    setComment,
    isSubmitting,
    editingReviewId,
    isFormVisible,
    setIsFormVisible,
    averageRating: computeAverageRating(reviews),
    handleToggleLike,
    handleSubmitReview,
    handleDeleteReview,
    startEditing,
    cancelForm,
  };
}

function StationSheetHeader({
  station,
  isFavorite,
  user,
  styles,
  isDark,
  onToggleFavorite,
  t,
}: Readonly<{
  station: StationBottomSheetProps['station'];
  isFavorite: boolean;
  user: ReturnType<typeof useAuth>['user'];
  styles: SheetStyles;
  isDark: boolean;
  onToggleFavorite: (isFav: boolean) => void;
  t: TFunction;
}>) {
  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {station.adreca}, {station.municipi}
        </Text>
        {user ? (
          <FavoriteButton estacio_id={station.id} isInitiallyFavorite={isFavorite} onToggle={onToggleFavorite} />
        ) : null}
      </View>
      <View style={styles.badgesRow}>
        <View style={styles.badge}>
          <MaterialIcons name="bolt" size={14} color={isDark ? '#34d399' : '#10b981'} />
          <Text style={styles.badgeText}>{formatStationKw(station.kw)} kW</Text>
        </View>
        <View style={styles.badge}>
          <MaterialIcons name="ev-station" size={14} color={isDark ? '#34d399' : '#10b981'} />
          <Text style={styles.badgeText}>{station.ac_dc}</Text>
        </View>
        <View style={styles.badge}>
          <MaterialIcons name="electrical-services" size={14} color={isDark ? '#34d399' : '#10b981'} />
          <Text style={styles.badgeText}>{station.tipus_connexio}</Text>
        </View>
      </View>
      {station.promotor ? (
        <Text style={styles.infoPromotor}>{t('stationSheet.manager', { name: station.promotor })}</Text>
      ) : null}
    </>
  );
}

function IncidentActionButton({
  operatiu,
  isDark,
  styles,
  onSolvedIncidencia,
  onOpenIncidenciaForm,
  t,
}: Readonly<{
  operatiu: boolean;
  isDark: boolean;
  styles: SheetStyles;
  onSolvedIncidencia: () => void;
  onOpenIncidenciaForm: () => void;
  t: TFunction;
}>) {
  const isOutOfService = operatiu === false;
  const backgroundColor = getIncidentButtonBackgroundColor(isOutOfService, isDark);
  const icon = isOutOfService ? 'check-circle' : 'report-problem';
  const label = isOutOfService ? t('home.reportSolvedIncident') : t('home.reportIncident');
  const onPress = isOutOfService ? onSolvedIncidencia : onOpenIncidenciaForm;

  return (
    <TouchableOpacity style={[styles.routeButton, { backgroundColor }]} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color="#fff" />
      <Text style={styles.routeButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function StationSheetActions({
  station,
  isCharging,
  elapsedSeconds,
  distanceToStation,
  chargingError,
  userLocation,
  styles,
  isDark,
  coords,
  onStartCharging,
  onFinishCharging,
  onCancelCharging,
  setChargingError,
  onOpenIncidenciaForm,
  onSolvedIncidencia,
  onStartNavigation,
  t,
}: Readonly<{
  station: StationBottomSheetProps['station'];
  isCharging: boolean;
  elapsedSeconds: number;
  distanceToStation: number | null;
  chargingError: string;
  userLocation: Location.LocationObject | null;
  styles: SheetStyles;
  isDark: boolean;
  coords: { latitude: number; longitude: number };
  onStartCharging: () => Promise<boolean>;
  onFinishCharging: () => void;
  onCancelCharging: () => void;
  setChargingError: (msg: string) => void;
  onOpenIncidenciaForm: () => void;
  onSolvedIncidencia: () => void;
  onStartNavigation: (coords: { latitude: number; longitude: number }) => void;
  t: TFunction;
}>) {
  return (
    <View style={styles.actionsContainer}>
      {isCharging ? (
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
      ) : (
        <View style={styles.chargingButtonContainer}>
          <StartChargingButton
            stationId={station.id}
            stationLat={coords.latitude}
            stationLon={coords.longitude}
            userLat={userLocation?.coords.latitude ?? 0}
            userLon={userLocation?.coords.longitude ?? 0}
            isCharging={isCharging}
            onStartCharging={onStartCharging}
            onError={(msg) => {
              setChargingError(msg);
              Alert.alert(t('common.error'), msg);
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

      {isCharging ? null : (
        <IncidentActionButton
          operatiu={station.operatiu}
          isDark={isDark}
          styles={styles}
          onSolvedIncidencia={onSolvedIncidencia}
          onOpenIncidenciaForm={onOpenIncidenciaForm}
          t={t}
        />
      )}

      {isCharging ? null : (
        <TouchableOpacity style={styles.routeButton} onPress={() => onStartNavigation(coords)}>
          <MaterialIcons name="directions" size={20} color="#fff" />
          <Text style={styles.routeButtonText}>{t('stationSheet.howToArrive')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StationSheetEventsSection({
  station,
  isDark,
  onFocusEventOnMap,
  styles,
}: Readonly<{
  station: StationBottomSheetProps['station'];
  isDark: boolean;
  onFocusEventOnMap?: StationBottomSheetProps['onFocusEventOnMap'];
  styles: SheetStyles;
}>) {
  const coords = getStationCoordinates(station);
  return (
    <View>
      <View style={styles.eventsSectionHeader}>
        <MaterialIcons name="event" size={22} color={isDark ? '#34d399' : '#10b981'} />
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Eventos cercanos
        </Text>
      </View>
      <StationNearbyEventsCarousel
        key={station?.id ?? 'station'}
        stationLat={coords.latitude}
        stationLon={coords.longitude}
        isDark={isDark}
        onFocusEventOnMap={onFocusEventOnMap}
      />
    </View>
  );
}

function ReviewForm({
  editingReviewId,
  rating,
  setRating,
  comment,
  setComment,
  isSubmitting,
  onSubmit,
  onCancel,
  styles,
  isDark,
  t,
}: Readonly<{
  editingReviewId: number | null;
  rating: number;
  setRating: (value: number) => void;
  comment: string;
  setComment: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  styles: SheetStyles;
  isDark: boolean;
  t: TFunction;
}>) {
  return (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>
        {editingReviewId ? t('stationSheet.editReview') : t('stationSheet.leaveReview')}
      </Text>
      <StarRating rating={rating} onRatingChange={setRating} disabled={false} size={32} />
      <TextInput
        style={styles.textInput}
        placeholder={t('stationSheet.commentPlaceholder')}
        placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
      />
      <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{t('common.publish')}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={{ marginTop: 12 }} onPress={onCancel}>
        <Text style={{ color: isDark ? '#94a3b8' : '#6b7280', textAlign: 'center' }}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReviewCard({
  review,
  currentUserId,
  isDark,
  styles,
  onToggleLike,
  onEdit,
  onDelete,
  t,
}: Readonly<{
  review: Review;
  currentUserId?: number;
  isDark: boolean;
  styles: SheetStyles;
  onToggleLike: (review: Review) => void;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: number) => void;
  t: TFunction;
}>) {
  const likeIconColor = getReviewLikeIconColor(review.user_has_liked, isDark);
  const isOwner = currentUserId === review.usuari_id;

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.username}</Text>
          <Text style={styles.reviewDate}>
            • {new Date(review.data_publicacio).toLocaleDateString()}
            {review.data_actualitzacio === review.data_publicacio ? '' : t('stationSheet.edited')}
          </Text>
        </View>
        <TouchableOpacity style={styles.likeButtonHeader} onPress={() => onToggleLike(review)}>
          <Text style={[styles.likeCount, review.user_has_liked && { color: '#ef4444' }]}>{review.likes_count}</Text>
          <MaterialIcons
            name={review.user_has_liked ? 'favorite' : 'favorite-border'}
            size={20}
            color={likeIconColor}
          />
        </TouchableOpacity>
      </View>
      <StarRating rating={review.puntuacio} size={16} />
      {review.comentari ? <Text style={styles.reviewComment}>{review.comentari}</Text> : null}
      {isOwner ? (
        <View style={styles.reviewActions}>
          <TouchableOpacity onPress={() => onEdit(review)}>
            <Text style={styles.actionTextBlue}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(review.id)}>
            <Text style={styles.actionTextRed}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function ReviewsList({
  loading,
  reviews,
  isDark,
  styles,
  currentUserId,
  onToggleLike,
  onEdit,
  onDelete,
  t,
}: Readonly<{
  loading: boolean;
  reviews: Review[];
  isDark: boolean;
  styles: SheetStyles;
  currentUserId?: number;
  onToggleLike: (review: Review) => void;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: number) => void;
  t: TFunction;
}>) {
  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} color={isDark ? '#fff' : '#10b981'} />;
  }
  if (reviews.length === 0) {
    return <Text style={styles.noReviewsText}>{t('stationSheet.noReviews')}</Text>;
  }
  return (
    <>
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          currentUserId={currentUserId}
          isDark={isDark}
          styles={styles}
          onToggleLike={onToggleLike}
          onEdit={onEdit}
          onDelete={onDelete}
          t={t}
        />
      ))}
    </>
  );
}

function StationSheetReviewsSection({
  user,
  reviewsState,
  isDark,
  styles,
  onSnapToFull,
  t,
}: Readonly<{
  user: ReturnType<typeof useAuth>['user'];
  reviewsState: ReturnType<typeof useStationReviews>;
  isDark: boolean;
  styles: SheetStyles;
  onSnapToFull: () => void;
  t: TFunction;
}>) {
  const {
    reviews,
    loadingReviews,
    rating,
    setRating,
    comment,
    setComment,
    isSubmitting,
    editingReviewId,
    isFormVisible,
    setIsFormVisible,
    averageRating,
    handleToggleLike,
    handleSubmitReview,
    handleDeleteReview,
    startEditing,
    cancelForm,
  } = reviewsState;

  const handleStartEditing = (review: Review) => {
    startEditing(review);
    onSnapToFull();
  };

  return (
    <>
      <View style={styles.reviewsHeaderContainer}>
        <View style={styles.reviewsHeaderLeft}>
          <Text style={styles.sectionTitle}>{t('stationSheet.reviews')}</Text>
          {averageRating ? (
            <View style={styles.averageContainer}>
              <Text style={styles.averageText}>{averageRating}</Text>
              <MaterialIcons name="star" size={20} color="#f59e0b" />
            </View>
          ) : null}
        </View>
        {user && !isFormVisible ? (
          <TouchableOpacity style={styles.addReviewFab} activeOpacity={0.8} onPress={() => setIsFormVisible(true)}>
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isFormVisible && user ? (
        <ReviewForm
          editingReviewId={editingReviewId}
          rating={rating}
          setRating={setRating}
          comment={comment}
          setComment={setComment}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitReview}
          onCancel={cancelForm}
          styles={styles}
          isDark={isDark}
          t={t}
        />
      ) : null}

      {!user && !isFormVisible ? <Text style={styles.loginPrompt}>{t('stationSheet.loginToReview')}</Text> : null}

      <ReviewsList
        loading={loadingReviews}
        reviews={reviews}
        isDark={isDark}
        styles={styles}
        currentUserId={user?.id}
        onToggleLike={handleToggleLike}
        onEdit={handleStartEditing}
        onDelete={handleDeleteReview}
        t={t}
      />
    </>
  );
}

export const StationBottomSheet: React.FC<StationBottomSheetProps> = ({
  station,
  onClose,
  isFavorite,
  onToggleFavorite,
  userLocation,
  isCharging,
  elapsedSeconds,
  distanceToStation,
  onStartCharging,
  onFinishCharging,
  onCancelCharging,
  chargingError,
  setChargingError,
  onStartNavigation,
  onOpenIncidenciaForm,
  onSolvedIncidencia,
  onFocusEventOnMap,
}) => {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const coords = useMemo(() => getStationCoordinates(station), [station]);
  const reviewsState = useStationReviews(station.id, user?.id, user?.token, t);

  const snapToFull = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(2);
  }, []);

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
        <StationSheetHeader
          station={station}
          isFavorite={isFavorite}
          user={user}
          styles={styles}
          isDark={isDark}
          onToggleFavorite={onToggleFavorite}
          t={t}
        />

        <StationSheetActions
          station={station}
          isCharging={isCharging}
          elapsedSeconds={elapsedSeconds}
          distanceToStation={distanceToStation}
          chargingError={chargingError}
          userLocation={userLocation}
          styles={styles}
          isDark={isDark}
          coords={coords}
          onStartCharging={onStartCharging}
          onFinishCharging={onFinishCharging}
          onCancelCharging={onCancelCharging}
          setChargingError={setChargingError}
          onOpenIncidenciaForm={onOpenIncidenciaForm}
          onSolvedIncidencia={onSolvedIncidencia}
          onStartNavigation={onStartNavigation}
          t={t}
        />

        <View style={styles.divider} />

        <StationSheetEventsSection
          station={station}
          isDark={isDark}
          onFocusEventOnMap={onFocusEventOnMap}
          styles={styles}
        />

        <View style={styles.divider} />

        <StationSheetReviewsSection
          user={user}
          reviewsState={reviewsState}
          isDark={isDark}
          styles={styles}
          onSnapToFull={snapToFull}
          t={t}
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

interface StationSheetPalette {
  sheetBg: string;
  titleColor: string;
  badgeBg: string;
  badgeText: string;
  errorBg: string;
  errorText: string;
  divider: string;
  sectionTitle: string;
  averageBg: string;
  averageBorder: string;
  averageText: string;
  formBg: string;
  formBorder: string;
  formTitle: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  mutedText: string;
  reviewBorder: string;
  reviewerName: string;
  likeCount: string;
  reviewComment: string;
  actionBlue: string;
  actionRed: string;
}

const DARK_PALETTE: StationSheetPalette = {
  sheetBg: '#1e293b',
  titleColor: Colors.dark.text,
  badgeBg: '#334155',
  badgeText: '#94a3b8',
  errorBg: '#450a0a',
  errorText: '#fca5a5',
  divider: '#334155',
  sectionTitle: Colors.dark.text,
  averageBg: '#334155',
  averageBorder: '#475569',
  averageText: '#fcd34d',
  formBg: '#334155',
  formBorder: '#475569',
  formTitle: '#cbd5e1',
  inputBg: '#1e293b',
  inputBorder: '#475569',
  inputText: Colors.dark.text,
  mutedText: '#94a3b8',
  reviewBorder: '#334155',
  reviewerName: Colors.dark.text,
  likeCount: '#cbd5e1',
  reviewComment: '#cbd5e1',
  actionBlue: '#60a5fa',
  actionRed: '#f87171',
};

const LIGHT_PALETTE: StationSheetPalette = {
  sheetBg: Colors.light.background,
  titleColor: Colors.light.text,
  badgeBg: '#ecfdf5',
  badgeText: '#047857',
  errorBg: '#fee2e2',
  errorText: '#ef4444',
  divider: '#e2e8f0',
  sectionTitle: '#1e293b',
  averageBg: '#fffbeb',
  averageBorder: '#fef3c7',
  averageText: '#b45309',
  formBg: '#f1f5f9',
  formBorder: '#e2e8f0',
  formTitle: '#475569',
  inputBg: '#fff',
  inputBorder: '#e2e8f0',
  inputText: Colors.light.text,
  mutedText: '#64748b',
  reviewBorder: '#f1f5f9',
  reviewerName: '#1e293b',
  likeCount: '#64748b',
  reviewComment: '#475569',
  actionBlue: '#3b82f6',
  actionRed: '#ef4444',
};

const buildSheetStyles = (palette: StationSheetPalette) =>
  StyleSheet.create({
    bottomSheetBackground: {
      borderRadius: 24,
      elevation: 10,
      backgroundColor: palette.sheetBg,
    },
    contentContainer: { padding: 20, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '700', color: palette.titleColor, flex: 1, marginRight: 10 },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
      alignItems: 'flex-start',
    },
    badge: {
      backgroundColor: palette.badgeBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
      maxWidth: '100%',
      alignSelf: 'flex-start',
    },
    badgeText: {
      color: palette.badgeText,
      fontWeight: '600',
      fontSize: 12,
      flexShrink: 1,
      minWidth: 0,
    },
    infoPromotor: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 16 },
    actionsContainer: { gap: 12, marginTop: 10 },
    chargingButtonContainer: { marginTop: 4 },
    routeButton: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
    routeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    errorMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.errorBg, padding: 12, borderRadius: 8, gap: 8 },
    errorText: { color: palette.errorText, fontSize: 14, flex: 1 },
    divider: { height: 1, backgroundColor: palette.divider, marginVertical: 24 },
    eventsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    reviewsHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    reviewsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: palette.sectionTitle },
    averageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.averageBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.averageBorder,
    },
    averageText: { fontSize: 16, fontWeight: '700', color: palette.averageText, marginRight: 2 },
    addReviewFab: {
      backgroundColor: '#10b981',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    formContainer: {
      backgroundColor: palette.formBg,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: palette.formBorder,
    },
    formTitle: { fontSize: 14, fontWeight: '600', color: palette.formTitle, marginBottom: 8 },
    textInput: {
      backgroundColor: palette.inputBg,
      borderWidth: 1,
      borderColor: palette.inputBorder,
      color: palette.inputText,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    submitButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
    submitButtonText: { color: '#fff', fontWeight: '700' },
    loginPrompt: { color: palette.mutedText, fontStyle: 'italic', marginBottom: 20 },
    noReviewsText: { color: palette.mutedText, textAlign: 'center', marginTop: 10 },
    reviewCard: { borderBottomWidth: 1, borderBottomColor: palette.reviewBorder, paddingVertical: 16 },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reviewerName: { fontWeight: '600', color: palette.reviewerName },
    reviewDate: { fontSize: 12, color: '#94a3b8' },
    likeButtonHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10 },
    likeCount: { fontSize: 14, color: palette.likeCount, fontWeight: '600' },
    reviewComment: { marginTop: 8, color: palette.reviewComment, lineHeight: 20 },
    reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
    actionTextBlue: { color: palette.actionBlue, fontSize: 14, fontWeight: '600' },
    actionTextRed: { color: palette.actionRed, fontSize: 14, fontWeight: '600' },
  });

const sheetStylesCache = {
  dark: buildSheetStyles(DARK_PALETTE),
  light: buildSheetStyles(LIGHT_PALETTE),
};

const createStyles = (isDark: boolean) => (isDark ? sheetStylesCache.dark : sheetStylesCache.light);
