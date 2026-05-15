import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/theme';
import { getEventosApiToken, EVENTOS_RADIO_KM_DEFAULT, formatRadioKmForUi } from '@/constants/eventosApi';
import {
  fetchEventosCercaDeEstacion,
  getEventoMapCoordinates,
  type EventoExterno,
} from '@/services/externalEventosService';

const ARROW_SLOT = 32;
/** Fracció de l’àrea de scroll que ocupa cada targeta (la resta fa “peek” del següent). */
const CARD_WIDTH_FRACTION = 0.72;
const CARD_GAP = 12;

type CarouselStyles = ReturnType<typeof createStyles>;
type CarouselPhase = 'loading' | 'token' | 'error' | 'empty' | 'content';

interface StationNearbyEventsCarouselProps {
  stationLat: number;
  stationLon: number;
  isDark: boolean;
  /** Marca l’event al mapa, tanca el panell d’estació i prepara ruta amb origen a l’estació. */
  onFocusEventOnMap?: (
    eventLat: number,
    eventLon: number,
    title: string,
    stationOriginLat: number,
    stationOriginLon: number
  ) => void;
}

async function loadNearbyEvents(
  stationLat: number,
  stationLon: number
): Promise<{ events: EventoExterno[]; error: string | null }> {
  if (!Number.isFinite(stationLat) || !Number.isFinite(stationLon)) {
    return { events: [], error: null };
  }
  if (!getEventosApiToken()) {
    return { events: [], error: 'token' };
  }
  try {
    const data = await fetchEventosCercaDeEstacion(stationLat, stationLon, EVENTOS_RADIO_KM_DEFAULT);
    return { events: Array.isArray(data.results) ? data.results : [], error: null };
  } catch (e) {
    return { events: [], error: e instanceof Error ? e.message : 'Error' };
  }
}

function resolveCarouselPhase(
  loading: boolean,
  error: string | null,
  eventCount: number
): CarouselPhase {
  if (loading) return 'loading';
  if (error === 'token') return 'token';
  if (error) return 'error';
  if (eventCount === 0) return 'empty';
  return 'content';
}

function getArrowIconColor(disabled: boolean, isDark: boolean): string {
  if (disabled) return isDark ? '#475569' : '#cbd5e1';
  return isDark ? '#e2e8f0' : '#334155';
}

function CarouselPhaseView({
  phase,
  styles,
  error,
  isDark,
}: Readonly<{
  phase: Exclude<CarouselPhase, 'content'>;
  styles: CarouselStyles;
  error: string | null;
  isDark: boolean;
}>) {
  if (phase === 'loading') {
    return (
      <View style={styles.root}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={isDark ? '#34d399' : '#10b981'} />
        </View>
      </View>
    );
  }
  if (phase === 'token') {
    return (
      <View style={styles.root}>
        <Text style={styles.hint}>
          Configura EXPO_PUBLIC_EVENTOS_API_TOKEN en el .env del frontend y reinicia Metro.
        </Text>
      </View>
    );
  }
  if (phase === 'error') {
    return (
      <View style={styles.root}>
        <Text style={styles.errorSmall}>{error}</Text>
      </View>
    );
  }
  return (
    <View style={styles.root}>
      <Text style={styles.hint}>
        No hay eventos en un radio de {formatRadioKmForUi(EVENTOS_RADIO_KM_DEFAULT)}.
      </Text>
    </View>
  );
}

function EventSlideCard({
  item,
  cardWidth,
  styles,
  isDark,
  mapFocusEnabled,
  onPress,
}: Readonly<{
  item: EventoExterno;
  cardWidth: number;
  styles: CarouselStyles;
  isDark: boolean;
  mapFocusEnabled: boolean;
  onPress: () => void;
}>) {
  return (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.85}
      disabled={!mapFocusEnabled}
      onPress={onPress}
      style={[styles.slideCard, { width: cardWidth, marginRight: CARD_GAP }]}
    >
      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.slideImage} contentFit="cover" />
      ) : (
        <View style={[styles.slideImage, styles.slideImagePlaceholder]}>
          <MaterialIcons name="event" size={40} color={isDark ? '#64748b' : '#94a3b8'} />
        </View>
      )}
      <Text style={styles.eventTitle} numberOfLines={3}>
        {item.titulo}
      </Text>
      <Text style={styles.eventDistance}>
        {typeof item.distancia_km === 'number' ? `${item.distancia_km.toFixed(2)} km` : '—'}
      </Text>
      {mapFocusEnabled ? <Text style={styles.tapHint}>Toca para ver en el mapa</Text> : null}
    </TouchableOpacity>
  );
}

function EventsCarouselPanel({
  events,
  styles,
  isDark,
  viewportWidth,
  cardWidth,
  snapInterval,
  activeIndex,
  scrollRef,
  onViewportLayout,
  onScrollEnd,
  onPrev,
  onNext,
  onEventPress,
  mapFocusEnabled,
}: Readonly<{
  events: EventoExterno[];
  styles: CarouselStyles;
  isDark: boolean;
  viewportWidth: number;
  cardWidth: number;
  snapInterval: number;
  activeIndex: number;
  scrollRef: React.RefObject<ScrollView | null>;
  onViewportLayout: (width: number) => void;
  onScrollEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onPrev: () => void;
  onNext: () => void;
  onEventPress: (item: EventoExterno) => void;
  mapFocusEnabled: boolean;
}>) {
  const atStart = activeIndex === 0;
  const atEnd = activeIndex >= events.length - 1;
  const showTrack = viewportWidth > 0 && cardWidth > 0;

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.carouselRow}>
          <TouchableOpacity
            style={[styles.arrowBtn, atStart && styles.arrowBtnDisabled]}
            onPress={onPrev}
            disabled={atStart}
            accessibilityLabel="Evento anterior"
          >
            <MaterialIcons name="chevron-left" size={28} color={getArrowIconColor(atStart, isDark)} />
          </TouchableOpacity>

          <View
            testID="eventos-carousel-viewport"
            style={styles.slideColumn}
            onLayout={(e) => onViewportLayout(Math.floor(e.nativeEvent.layout.width))}
          >
            {showTrack ? (
              <ScrollView
                testID="eventos-carousel-scroll"
                ref={scrollRef}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                decelerationRate="fast"
                snapToInterval={snapInterval}
                snapToAlignment="start"
                disableIntervalMomentum
                onMomentumScrollEnd={onScrollEnd}
                scrollEventThrottle={16}
                style={{ width: viewportWidth }}
                contentContainerStyle={{
                  paddingRight: Math.max(CARD_GAP, viewportWidth - cardWidth),
                }}
              >
                {events.map((item) => (
                  <EventSlideCard
                    key={item.id}
                    item={item}
                    cardWidth={cardWidth}
                    styles={styles}
                    isDark={isDark}
                    mapFocusEnabled={mapFocusEnabled}
                    onPress={() => onEventPress(item)}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.slideMeasurePlaceholder} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.arrowBtn, atEnd && styles.arrowBtnDisabled]}
            onPress={onNext}
            disabled={atEnd}
            accessibilityLabel="Siguiente evento"
          >
            <MaterialIcons name="chevron-right" size={28} color={getArrowIconColor(atEnd, isDark)} />
          </TouchableOpacity>
        </View>
        {events.length > 1 ? (
          <Text style={styles.pageHint}>
            Desliza para ver más · {activeIndex + 1} / {events.length}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function StationNearbyEventsCarousel({
  stationLat,
  stationLon,
  isDark,
  onFocusEventOnMap,
}: Readonly<StationNearbyEventsCarouselProps>) {
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [events, setEvents] = useState<EventoExterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardWidth =
    viewportWidth > 0 ? Math.max(160, Math.floor(viewportWidth * CARD_WIDTH_FRACTION)) : 0;
  const snapInterval = cardWidth > 0 ? cardWidth + CARD_GAP : 0;
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const phase = resolveCarouselPhase(loading, error, events.length);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadNearbyEvents(stationLat, stationLon);
    setEvents(result.events);
    setError(result.error);
    setLoading(false);
  }, [stationLat, stationLon]);

  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    void load();
  }, [load]);

  useEffect(() => {
    if (snapInterval > 0) {
      scrollRef.current?.scrollTo({ x: 0, animated: false });
      setActiveIndex(0);
    }
  }, [snapInterval]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (snapInterval <= 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / snapInterval);
      setActiveIndex(Math.min(Math.max(0, idx), Math.max(0, events.length - 1)));
    },
    [snapInterval, events.length]
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      if (snapInterval <= 0) return;
      scrollRef.current?.scrollTo({ x: index * snapInterval, animated: true });
      setActiveIndex(index);
    },
    [snapInterval]
  );

  const goPrev = useCallback(() => {
    if (activeIndex <= 0) return;
    scrollToIndex(activeIndex - 1);
  }, [activeIndex, scrollToIndex]);

  const goNext = useCallback(() => {
    if (activeIndex >= events.length - 1) return;
    scrollToIndex(activeIndex + 1);
  }, [activeIndex, events.length, scrollToIndex]);

  const handleEventCardPress = useCallback(
    (item: EventoExterno) => {
      if (!onFocusEventOnMap) return;
      const coords = getEventoMapCoordinates(item, stationLat, stationLon);
      if (!coords) {
        Alert.alert('Evento', 'No hay coordenadas para este evento en el mapa.');
        return;
      }
      onFocusEventOnMap(coords.latitude, coords.longitude, item.titulo, stationLat, stationLon);
    },
    [onFocusEventOnMap, stationLat, stationLon]
  );

  if (phase !== 'content') {
    return <CarouselPhaseView phase={phase} styles={styles} error={error} isDark={isDark} />;
  }

  return (
    <EventsCarouselPanel
      events={events}
      styles={styles}
      isDark={isDark}
      viewportWidth={viewportWidth}
      cardWidth={cardWidth}
      snapInterval={snapInterval}
      activeIndex={activeIndex}
      scrollRef={scrollRef}
      onViewportLayout={setViewportWidth}
      onScrollEnd={onScrollEnd}
      onPrev={goPrev}
      onNext={goNext}
      onEventPress={handleEventCardPress}
      mapFocusEnabled={!!onFocusEventOnMap}
    />
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    root: { marginBottom: 0 },
    panel: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      backgroundColor: isDark ? '#0f172a' : '#fff',
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    carouselRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    slideColumn: {
      flex: 1,
      minWidth: 0,
    },
    arrowBtn: {
      width: ARROW_SLOT,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 8,
    },
    arrowBtnDisabled: { opacity: 0.45 },
    slideCard: {
      alignItems: 'stretch',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      padding: 8,
    },
    slideImage: {
      width: '100%',
      height: 100,
      borderRadius: 8,
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
    },
    slideImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    eventTitle: {
      marginTop: 10,
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? Colors.dark.text : '#0f172a',
      lineHeight: 20,
    },
    eventDistance: {
      marginTop: 6,
      fontSize: 13,
      color: isDark ? '#94a3b8' : '#64748b',
      fontWeight: '600',
    },
    tapHint: {
      marginTop: 6,
      fontSize: 11,
      color: isDark ? '#64748b' : '#94a3b8',
      fontStyle: 'italic',
    },
    pageHint: {
      textAlign: 'center',
      marginTop: 8,
      fontSize: 12,
      color: isDark ? '#64748b' : '#94a3b8',
    },
    loadingBox: { paddingVertical: 24, alignItems: 'center' },
    slideMeasurePlaceholder: { height: 200 },
    hint: {
      fontSize: 13,
      color: isDark ? '#94a3b8' : '#64748b',
      lineHeight: 18,
    },
    errorSmall: {
      fontSize: 13,
      color: isDark ? '#f87171' : '#dc2626',
    },
  });
