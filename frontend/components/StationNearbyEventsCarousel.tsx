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
  /** When true, omit title (parent renders section header like Valoraciones). */
  embedInSection?: boolean;
}

export function StationNearbyEventsCarousel({
  stationLat,
  stationLon,
  isDark,
  onFocusEventOnMap,
  embedInSection = false,
}: StationNearbyEventsCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  /** Amplada del contenidor del ScrollView (entre fletxes). */
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [events, setEvents] = useState<EventoExterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardWidth =
    viewportWidth > 0 ? Math.max(160, Math.floor(viewportWidth * CARD_WIDTH_FRACTION)) : 0;
  const snapInterval = cardWidth > 0 ? cardWidth + CARD_GAP : 0;

  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const load = useCallback(async () => {
    if (!Number.isFinite(stationLat) || !Number.isFinite(stationLon)) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!getEventosApiToken()) {
      setError('token');
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventosCercaDeEstacion(
        stationLat,
        stationLon,
        EVENTOS_RADIO_KM_DEFAULT
      );
      setEvents(Array.isArray(data.results) ? data.results : []);
    } catch (e) {
      setEvents([]);
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
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

  const goPrev = () => {
    if (activeIndex <= 0 || snapInterval <= 0) return;
    const next = activeIndex - 1;
    scrollRef.current?.scrollTo({ x: next * snapInterval, animated: true });
    setActiveIndex(next);
  };

  const goNext = () => {
    if (activeIndex >= events.length - 1 || snapInterval <= 0) return;
    const next = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: next * snapInterval, animated: true });
    setActiveIndex(next);
  };

  const handleEventCardPress = (item: EventoExterno) => {
    if (!onFocusEventOnMap) return;
    const coords = getEventoMapCoordinates(item, stationLat, stationLon);
    if (!coords) {
      Alert.alert('Evento', 'No hay coordenadas para este evento en el mapa.');
      return;
    }
    onFocusEventOnMap(
      coords.latitude,
      coords.longitude,
      item.titulo,
      stationLat,
      stationLon
    );
  };

  const rootStyle = embedInSection ? styles.sectionEmbed : styles.section;

  if (loading) {
    return (
      <View style={rootStyle}>
        {!embedInSection ? <Text style={styles.sectionTitle}>Eventos cercanos</Text> : null}
        <View style={styles.loadingBox}>
          <ActivityIndicator color={isDark ? '#34d399' : '#10b981'} />
        </View>
      </View>
    );
  }

  if (error === 'token') {
    return (
      <View style={rootStyle}>
        {!embedInSection ? <Text style={styles.sectionTitle}>Eventos cercanos</Text> : null}
        <Text style={styles.hint}>
          Configura EXPO_PUBLIC_EVENTOS_API_TOKEN en el .env del frontend y reinicia Metro.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={rootStyle}>
        {!embedInSection ? <Text style={styles.sectionTitle}>Eventos cercanos</Text> : null}
        <Text style={styles.errorSmall}>{error}</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={rootStyle}>
        {!embedInSection ? <Text style={styles.sectionTitle}>Eventos cercanos</Text> : null}
        <Text style={styles.hint}>
          No hay eventos en un radio de {formatRadioKmForUi(EVENTOS_RADIO_KM_DEFAULT)}.
        </Text>
      </View>
    );
  }

  return (
    <View style={rootStyle}>
      {!embedInSection ? <Text style={styles.sectionTitle}>Eventos cercanos</Text> : null}
      <View style={styles.panel}>
        <View style={styles.carouselRow}>
          <TouchableOpacity
            style={[styles.arrowBtn, activeIndex === 0 && styles.arrowBtnDisabled]}
            onPress={goPrev}
            disabled={activeIndex === 0}
            accessibilityLabel="Evento anterior"
          >
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={activeIndex === 0 ? (isDark ? '#475569' : '#cbd5e1') : isDark ? '#e2e8f0' : '#334155'}
            />
          </TouchableOpacity>

          <View
            testID="eventos-carousel-viewport"
            style={styles.slideColumn}
            onLayout={(e) => setViewportWidth(Math.floor(e.nativeEvent.layout.width))}
          >
            {viewportWidth > 0 && cardWidth > 0 ? (
              <ScrollView
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
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    disabled={!onFocusEventOnMap}
                    onPress={() => handleEventCardPress(item)}
                    style={[styles.slideCard, { width: cardWidth, marginRight: CARD_GAP }]}
                  >
                    {item.imagen_url ? (
                      <Image
                        source={{ uri: item.imagen_url }}
                        style={styles.slideImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.slideImage, styles.slideImagePlaceholder]}>
                        <MaterialIcons name="event" size={40} color={isDark ? '#64748b' : '#94a3b8'} />
                      </View>
                    )}
                    <Text style={styles.eventTitle} numberOfLines={3}>
                      {item.titulo}
                    </Text>
                    <Text style={styles.eventDistance}>
                      {typeof item.distancia_km === 'number'
                        ? `${item.distancia_km.toFixed(2)} km`
                        : '—'}
                    </Text>
                    {onFocusEventOnMap ? (
                      <Text style={styles.tapHint}>Toca para ver en el mapa</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.slideMeasurePlaceholder} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.arrowBtn, activeIndex >= events.length - 1 && styles.arrowBtnDisabled]}
            onPress={goNext}
            disabled={activeIndex >= events.length - 1}
            accessibilityLabel="Siguiente evento"
          >
            <MaterialIcons
              name="chevron-right"
              size={28}
              color={
                activeIndex >= events.length - 1
                  ? isDark
                    ? '#475569'
                    : '#cbd5e1'
                  : isDark
                    ? '#e2e8f0'
                    : '#334155'
              }
            />
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

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    section: { marginBottom: 8 },
    sectionEmbed: { marginBottom: 0 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? Colors.dark.text : Colors.light.text,
      marginBottom: 10,
    },
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
