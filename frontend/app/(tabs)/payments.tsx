import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getApiUrl } from '@/constants/api';
import { WelcomePremiumModal } from '@/components/WelcomePremiumModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildFallbackStatus,
  formatPeriodEnd,
  type SubscriptionStatus,
} from '@/features/subscription/subscriptionHelpers';

const STRIPE_SUCCESS_URL = 'https://example.com/stripe/success';
const STRIPE_CANCEL_URL = 'https://example.com/stripe/cancel';
const PREMIUM_BENEFITS = [
  'Sin anuncios',
  'Acceso ilimitado a funciones',
  'Soporte prioritario',
];

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showWelcomePremium, setShowWelcomePremium] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<'new' | 'reactivated'>('reactivated');
  const isPremium = Boolean(subStatus?.isPremium);
  const premiumPulse = React.useRef(new Animated.Value(0)).current;
  const premiumScale = React.useRef(new Animated.Value(1)).current;
  const premiumChipScale = React.useRef(new Animated.Value(1)).current;
  const premiumAura = React.useRef(new Animated.Value(0)).current;
  const prevIsPremium = React.useRef(false);
  const checkoutFlowRef = React.useRef(false);

  const sleep = useCallback((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)), []);

  const loadSubscriptionStatus = useCallback(async () => {
    if (!user?.id) {
      setSubStatus(null);
      return;
    }
    setLoadingStatus(true);
    try {
      const api = getApiUrl();
      const res = await fetch(`${api}/subscription/status?userId=${user.id}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as SubscriptionStatus;
      setSubStatus(data);
    } catch (err) {
      console.warn('[payments] Error cargando suscripción:', err);
      setSubStatus(buildFallbackStatus());
    } finally {
      setLoadingStatus(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  useEffect(() => {
    if (!isPremium) {
      premiumPulse.stopAnimation();
      premiumScale.stopAnimation();
      premiumChipScale.stopAnimation();
      premiumAura.stopAnimation();
      premiumPulse.setValue(0);
      premiumScale.setValue(1);
      premiumChipScale.setValue(1);
      premiumAura.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(premiumPulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(premiumPulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(premiumScale, {
            toValue: 1.03,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(premiumScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(premiumChipScale, {
            toValue: 1.08,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(premiumChipScale, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(premiumAura, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(premiumAura, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ])
      ),
    ]).start();
  }, [isPremium, premiumAura, premiumChipScale, premiumPulse, premiumScale]);

  const playWelcomePremium = useCallback((mode: 'new' | 'reactivated') => {
    setWelcomeMode(mode);
    setShowWelcomePremium(true);
  }, []);

  useEffect(() => {
    const becamePremium = !prevIsPremium.current && isPremium;
    const fromCheckout = checkoutFlowRef.current;
    prevIsPremium.current = isPremium;
    if (!becamePremium || !fromCheckout) return;

    checkoutFlowRef.current = false;
    playWelcomePremium('new');
  }, [isPremium, playWelcomePremium]);

  const periodEndLabel = useMemo(() => {
    return formatPeriodEnd(subStatus?.current_period_end ?? null);
  }, [subStatus?.current_period_end]);

  const refreshStatusAfterCheckout = useCallback(
    async (sessionId: string) => {
      if (!user?.id) return;
      const api = getApiUrl();
      // El webhook puede tardar unos segundos; confirmamos por sesión y reintentamos.
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const confirmRes = await fetch(`${api}/subscription/confirm-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, sessionId }),
          });
          if (confirmRes.ok) {
            const confirmData = (await confirmRes.json()) as {
              confirmed?: boolean;
              pending?: boolean;
            };
            await loadSubscriptionStatus();
            if (confirmData.confirmed) return;
            if (!confirmData.pending) break;
          }
        } catch (err) {
          console.warn('[payments] Error confirmando checkout:', err);
        }
        await sleep(1200 + attempt * 500);
      }
      await loadSubscriptionStatus();
    },
    [loadSubscriptionStatus, sleep, user?.id]
  );

  const onStartPremium = useCallback(async () => {
    if (!user?.id || startingCheckout) return;
    setStartingCheckout(true);
    try {
      const api = getApiUrl();
      const res = await fetch(`${api}/subscription/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          successUrl: STRIPE_SUCCESS_URL,
          cancelUrl: STRIPE_CANCEL_URL,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`checkout ${res.status} ${errText}`);
      }

      const data = (await res.json()) as { url?: string; sessionId?: string };
      if (!data.url) throw new Error('No se recibió URL de checkout');
      if (!data.sessionId) throw new Error('No se recibió sessionId de checkout');

      checkoutFlowRef.current = true;
      await WebBrowser.openBrowserAsync(data.url);
      await refreshStatusAfterCheckout(data.sessionId);
    } catch (err) {
      console.warn('[payments] Error iniciando checkout:', err);
    } finally {
      setStartingCheckout(false);
    }
  }, [refreshStatusAfterCheckout, startingCheckout, user?.id]);

  const onCancelPremium = useCallback(async () => {
    if (!user?.id || canceling) return;
    setCanceling(true);
    try {
      const api = getApiUrl();
      const res = await fetch(`${api}/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`cancel ${res.status} ${errText}`);
      }
      await loadSubscriptionStatus();
    } catch (err) {
      console.warn('[payments] Error cancelando suscripción:', err);
    } finally {
      setCanceling(false);
    }
  }, [canceling, loadSubscriptionStatus, user?.id]);

  const onReactivatePremium = useCallback(async () => {
    if (!user?.id || reactivating) return;
    setReactivating(true);
    try {
      const api = getApiUrl();
      const res = await fetch(`${api}/subscription/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`reactivate ${res.status} ${errText}`);
      }
      await loadSubscriptionStatus();
      playWelcomePremium('reactivated');
    } catch (err) {
      console.warn('[payments] Error reactivando suscripción:', err);
    } finally {
      setReactivating(false);
    }
  }, [loadSubscriptionStatus, playWelcomePremium, reactivating, user?.id]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Escoger plan</Text>
      <Text style={styles.subtitle}>Elige el plan que mejor se adapte a ti</Text>

      {loadingStatus ? (
        <ActivityIndicator color="#10b981" size="large" style={styles.loader} />
      ) : (
        <View style={styles.plansContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tus planes</Text>
            <Text style={styles.sectionHint}>Puedes cambiar cuando quieras</Text>
          </View>

          <View style={[styles.planCard, styles.freeCard, !isPremium && styles.activeFreeCard]}>
            <View style={styles.headerRow}>
              <Text style={styles.planName}>FREE</Text>
              {!isPremium && <Text style={styles.activeFreeChip}>Plan actual</Text>}
            </View>
            <Text style={styles.planPrice}>0€/mes</Text>
            <Text style={styles.planDesc}>Mapa, favoritos y funcionalidades base.</Text>
          </View>

          <Animated.View
            style={[
              styles.planCard,
              styles.premiumCard,
              isPremium && styles.activePremiumCard,
              isPremium && {
                transform: [{ scale: premiumScale }],
                borderColor: premiumPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#22c55e', '#16a34a'],
                }),
                shadowOpacity: premiumPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.08, 0.22],
                }),
              },
            ]}
          >
            {isPremium && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.premiumAura,
                  {
                    opacity: premiumAura.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.08, 0.24],
                    }),
                    transform: [
                      {
                        scale: premiumAura.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.96, 1.04],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.premiumEyebrow}>e-Go Premium</Text>
                <Text style={styles.premiumName}>Premium</Text>
              </View>
              {isPremium && (
                <Animated.View style={{ transform: [{ scale: premiumChipScale }] }}>
                  <Text style={styles.activePremiumChip}>Activo</Text>
                </Animated.View>
              )}
            </View>
            <Text style={styles.premiumPrice}>4,99€/mes</Text>
            <Text style={styles.premiumDesc}>La experiencia completa de e-Go, sin límites.</Text>

            <View style={styles.benefitsWrap}>
              {PREMIUM_BENEFITS.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <Text style={styles.benefitCheck}>✓</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {periodEndLabel && <Text style={styles.periodText}>Renovación: {periodEndLabel}</Text>}

            {isPremium && subStatus?.cancel_at_period_end ? (
              <>
                <Text style={styles.cancelInfo}>
                  Tu suscripción está programada para cancelarse al final del periodo.
                </Text>
                <Pressable
                  style={[styles.reactivateButton, reactivating && styles.buttonDisabled]}
                  onPress={onReactivatePremium}
                  disabled={reactivating}
                >
                  <Text style={styles.reactivateButtonText}>
                    {reactivating ? 'Reactivando...' : 'Reactivar suscripción'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {!isPremium ? (
              <Pressable
                style={[styles.button, startingCheckout && styles.buttonDisabled]}
                onPress={onStartPremium}
                disabled={startingCheckout}
              >
                <Text style={styles.buttonText}>
                  {startingCheckout ? 'Abriendo Stripe...' : 'Pasar a Premium'}
                </Text>
              </Pressable>
            ) : (
              !subStatus?.cancel_at_period_end && (
                <Pressable
                  style={[styles.secondaryButton, canceling && styles.buttonDisabled]}
                  onPress={onCancelPremium}
                  disabled={canceling}
                >
                  <Text style={styles.secondaryButtonText}>
                    {canceling ? 'Cancelando...' : 'Cancelar suscripción'}
                  </Text>
                </Pressable>
              )
            )}
          </Animated.View>
        </View>
      )}
      <WelcomePremiumModal
        visible={showWelcomePremium}
        mode={welcomeMode}
        onDismiss={() => setShowWelcomePremium(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 15,
    marginBottom: 20,
  },
  loader: {
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 13,
  },
  plansContainer: {
    width: '100%',
    gap: 16,
  },
  planCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  freeCard: {
    backgroundColor: '#ffffff',
  },
  activeFreeCard: {
    borderColor: '#22c55e',
    backgroundColor: '#ffffff',
  },
  premiumCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe5ee',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
    overflow: 'hidden',
  },
  premiumAura: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#22c55e',
    borderRadius: 18,
  },
  activePremiumCard: {
    borderColor: '#22c55e',
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  activeFreeChip: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planPrice: {
    marginTop: 8,
    color: '#111827',
    fontSize: 30,
    fontWeight: '700',
  },
  planDesc: {
    marginTop: 6,
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  premiumEyebrow: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  premiumName: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  activePremiumChip: {
    backgroundColor: '#e9fbe7',
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  premiumPrice: {
    marginTop: 12,
    color: '#0f172a',
    fontSize: 36,
    fontWeight: '800',
  },
  premiumDesc: {
    marginTop: 6,
    color: '#475569',
    fontSize: 14,
  },
  benefitsWrap: {
    marginTop: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    paddingVertical: 10,
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitCheck: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '800',
  },
  benefitText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '500',
  },
  periodText: {
    marginTop: 8,
    color: '#166534',
    fontSize: 13,
  },
  button: {
    marginTop: 14,
    backgroundColor: '#85f755',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelInfo: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 13,
  },
  reactivateButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(133,247,85,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(133,247,85,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reactivateButtonText: {
    color: '#85f755',
    fontWeight: '700',
    fontSize: 14,
  },
});