import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getApiUrl } from '@/constants/api';
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
  const isPremium = Boolean(subStatus?.isPremium);

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

  const periodEndLabel = useMemo(() => {
    return formatPeriodEnd(subStatus?.current_period_end ?? null);
  }, [subStatus?.current_period_end]);

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

      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error('No se recibió URL de checkout');

      await WebBrowser.openBrowserAsync(data.url);
      await loadSubscriptionStatus();
    } catch (err) {
      console.warn('[payments] Error iniciando checkout:', err);
    } finally {
      setStartingCheckout(false);
    }
  }, [loadSubscriptionStatus, startingCheckout, user?.id]);

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
    } catch (err) {
      console.warn('[payments] Error reactivando suscripción:', err);
    } finally {
      setReactivating(false);
    }
  }, [loadSubscriptionStatus, reactivating, user?.id]);

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

          <View style={[styles.planCard, styles.premiumCard, isPremium && styles.activePremiumCard]}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.premiumEyebrow}>e-Go Premium</Text>
                <Text style={styles.premiumName}>Premium</Text>
              </View>
              {isPremium && <Text style={styles.activePremiumChip}>Activo</Text>}
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
          </View>
        </View>
      )}
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