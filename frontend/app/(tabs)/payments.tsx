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
import { useColorScheme } from '@/hooks/use-color-scheme';

import { appFetch } from '@/services/appFetch';
import { getApiUrl } from '@/constants/api';
import { getSemanticColors } from '@/constants/accessibilityColors';
import { WelcomePremiumModal } from '@/components/WelcomePremiumModal';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { formatPeriodEnd } from '@/features/subscription/subscriptionHelpers';

const STRIPE_SUCCESS_URL = 'https://example.com/stripe/success';
const STRIPE_CANCEL_URL = 'https://example.com/stripe/cancel';

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const themeIndex = colorScheme === 'dark' ? 1 : 0;
  const pick = (values: [string, string]) => values[themeIndex];
  const premiumBorderPulse = useMemo(
    () => (colorblindFriendly ? [sem.accent, '#0284c7'] : ['#22c55e', '#16a34a']),
    [colorblindFriendly, sem.accent]
  );
  const { user } = useAuth();
  const {
    subStatus,
    isPremium,
    isLoading: loadingStatus,
    refreshSubscription: loadSubscriptionStatus,
  } = useSubscription();
  const theme = {
    background: pick(['#f8fafc', '#0f172a']),
    title: pick(['#111827', '#f1f5f9']),
    subtitle: pick(['#4b5563', '#94a3b8']),
    sectionTitle: pick(['#0f172a', '#e2e8f0']),
    sectionHint: pick(['#64748b', '#94a3b8']),
    cardBg: pick(['#ffffff', '#1e293b']),
    cardBorder: pick(['#e5e7eb', '#334155']),
    premiumBorder: pick(['#dbe5ee', '#334155']),
    premiumShadow: colorblindFriendly ? sem.accent : pick(['#22c55e', '#16a34a']),
    planText: pick(['#111827', '#f1f5f9']),
    planDesc: pick(['#4b5563', '#cbd5e1']),
    premiumName: pick(['#0f172a', '#f1f5f9']),
    premiumDesc: pick(['#475569', '#cbd5e1']),
    eyebrow: pick(['#64748b', '#94a3b8']),
    benefitText: pick(['#1e293b', '#e2e8f0']),
    benefitCheck: pick(['#64748b', '#94a3b8']),
    muted: pick(['#64748b', '#94a3b8']),
    secondaryBg: pick(['#f8fafc', '#334155']),
    secondaryBorder: pick(['#cbd5e1', '#475569']),
    secondaryText: pick(['#475569', '#e2e8f0']),
    activePremiumChipBg: colorblindFriendly ? sem.chipActiveBg : pick(['#e9fbe7', '#14532d']),
    activePremiumChipText: colorblindFriendly ? sem.chipActiveText : pick(['#166534', '#86efac']),
    activePremiumChipBorder: colorblindFriendly ? sem.accent : pick(['#86efac', '#22c55e']),
    activeFreeChipBg: colorblindFriendly ? sem.accent : '#22c55e',
    activeFreeChipText: '#ffffff',
    primaryBtnBg: colorblindFriendly ? sem.accent : '#85f755',
    primaryBtnText: colorblindFriendly ? '#ffffff' : pick(['#0f172a', '#052e16']),
    periodText: colorblindFriendly ? sem.chipActiveText : pick(['#166534', '#86efac']),
    reactivateBg: colorblindFriendly
      ? pick(['rgba(14,165,233,0.16)', 'rgba(2,132,199,0.22)'])
      : pick(['rgba(133,247,85,0.2)', 'rgba(34,197,94,0.2)']),
    reactivateBorder: colorblindFriendly
      ? pick(['rgba(14,165,233,0.45)', 'rgba(2,132,199,0.55)'])
      : pick(['rgba(133,247,85,0.55)', 'rgba(34,197,94,0.55)']),
    reactivateText: colorblindFriendly ? pick(['#0ea5e9', '#7dd3fc']) : pick(['#85f755', '#86efac']),
    loader: sem.accent,
    premiumAuraFill: sem.accent,
    activePlanBorder: sem.accent,
  };
  const styles = useMemo(() => createStyles(theme), [colorScheme, colorblindFriendly]);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showWelcomePremium, setShowWelcomePremium] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<'new' | 'reactivated'>('reactivated');
  const premiumPulse = React.useRef(new Animated.Value(0)).current;
  const premiumScale = React.useRef(new Animated.Value(1)).current;
  const premiumChipScale = React.useRef(new Animated.Value(1)).current;
  const premiumAura = React.useRef(new Animated.Value(0)).current;
  const prevIsPremium = React.useRef(false);
  const checkoutFlowRef = React.useRef(false);

  const sleep = useCallback((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)), []);

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
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const confirmRes = await appFetch('/subscription/confirm-checkout-session', {
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
      const res = await appFetch('/subscription/create-checkout-session', {
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
      const res = await appFetch('/subscription/cancel', {
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
      const res = await appFetch('/subscription/reactivate', {
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
      <Text style={styles.title}>{t('payments.title')}</Text>
      <Text style={styles.subtitle}>{t('payments.subtitle')}</Text>

      {loadingStatus ? (
        <ActivityIndicator color={sem.accent} size="large" style={styles.loader} />
      ) : (
        <View style={styles.plansContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('payments.yourPlans')}</Text>
            <Text style={styles.sectionHint}>{t('payments.plansHint')}</Text>
          </View>

          <View style={[styles.planCard, styles.freeCard, !isPremium && styles.activeFreeCard]}>
            <View style={styles.headerRow}>
              <Text style={styles.planName}>{t('payments.freeName')}</Text>
              {!isPremium && <Text style={styles.activeFreeChip}>{t('payments.currentPlan')}</Text>}
            </View>
            <Text style={styles.planPrice}>{t('payments.freePrice')}</Text>
            <Text style={styles.planDesc}>{t('payments.freeDesc')}</Text>
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
                  outputRange: premiumBorderPulse,
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
                <Text style={styles.premiumEyebrow}>{t('payments.premiumEyebrow')}</Text>
                <Text style={styles.premiumName}>{t('payments.premiumName')}</Text>
              </View>
              {isPremium && (
                <Animated.View style={{ transform: [{ scale: premiumChipScale }] }}>
                  <Text style={styles.activePremiumChip}>{t('common.active')}</Text>
                </Animated.View>
              )}
            </View>
            <Text style={styles.premiumPrice}>{t('payments.premiumPrice')}</Text>
            <Text style={styles.premiumDesc}>{t('payments.premiumDesc')}</Text>

            <View style={styles.benefitsWrap}>
              {(['benefit1', 'benefit2', 'benefit3'] as const).map((key) => (
                <View key={key} style={styles.benefitRow}>
                  <Text style={styles.benefitCheck}>✓</Text>
                  <Text style={styles.benefitText}>{t(`payments.${key}`)}</Text>
                </View>
              ))}
            </View>

            {periodEndLabel && <Text style={styles.periodText}>{t('payments.renewal', { date: periodEndLabel })}</Text>}

            {isPremium && subStatus?.cancel_at_period_end ? (
              <>
                <Text style={styles.cancelInfo}>
                  {t('payments.cancelScheduled')}
                </Text>
                <Pressable
                  style={[styles.reactivateButton, reactivating && styles.buttonDisabled]}
                  onPress={onReactivatePremium}
                  disabled={reactivating}
                >
                  <Text style={styles.reactivateButtonText}>
                    {reactivating ? t('payments.reactivating') : t('payments.reactivate')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {!isPremium ? (
              <Pressable
                testID="payments-premium-cta"
                style={[styles.button, startingCheckout && styles.buttonDisabled]}
                onPress={onStartPremium}
                disabled={startingCheckout}
              >
                <Text style={styles.buttonText}>
                  {startingCheckout ? t('payments.openingStripe') : t('payments.goPremium')}
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
                    {canceling ? t('payments.canceling') : t('payments.cancelSub')}
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

const createStyles = (theme: {
  background: string;
  title: string;
  subtitle: string;
  sectionTitle: string;
  sectionHint: string;
  cardBg: string;
  cardBorder: string;
  premiumBorder: string;
  premiumShadow: string;
  planText: string;
  planDesc: string;
  premiumName: string;
  premiumDesc: string;
  eyebrow: string;
  benefitText: string;
  benefitCheck: string;
  muted: string;
  secondaryBg: string;
  secondaryBorder: string;
  secondaryText: string;
  activePremiumChipBg: string;
  activePremiumChipText: string;
  activePremiumChipBorder: string;
  activeFreeChipBg: string;
  activeFreeChipText: string;
  primaryBtnBg: string;
  primaryBtnText: string;
  periodText: string;
  reactivateBg: string;
  reactivateBorder: string;
  reactivateText: string;
  premiumAuraFill: string;
  activePlanBorder: string;
}) => StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  title: {
    color: theme.title,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: theme.subtitle,
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
    color: theme.sectionTitle,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    marginTop: 2,
    color: theme.sectionHint,
    fontSize: 13,
  },
  plansContainer: {
    width: '100%',
    gap: 16,
  },
  planCard: {
    borderRadius: 18,
    backgroundColor: theme.cardBg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  freeCard: {
    backgroundColor: theme.cardBg,
  },
  activeFreeCard: {
    borderColor: theme.activePlanBorder,
    backgroundColor: theme.cardBg,
  },
  premiumCard: {
    backgroundColor: theme.cardBg,
    borderColor: theme.premiumBorder,
    shadowColor: theme.premiumShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
    overflow: 'hidden',
  },
  premiumAura: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.premiumAuraFill,
    borderRadius: 18,
  },
  activePremiumCard: {
    borderColor: theme.activePlanBorder,
    backgroundColor: theme.cardBg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    color: theme.planText,
    fontSize: 22,
    fontWeight: '800',
  },
  activeFreeChip: {
    backgroundColor: theme.activeFreeChipBg,
    color: theme.activeFreeChipText,
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planPrice: {
    marginTop: 8,
    color: theme.planText,
    fontSize: 30,
    fontWeight: '700',
  },
  planDesc: {
    marginTop: 6,
    color: theme.planDesc,
    fontSize: 14,
    lineHeight: 20,
  },
  premiumEyebrow: {
    color: theme.eyebrow,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  premiumName: {
    color: theme.premiumName,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  activePremiumChip: {
    backgroundColor: theme.activePremiumChipBg,
    color: theme.activePremiumChipText,
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.activePremiumChipBorder,
  },
  premiumPrice: {
    marginTop: 12,
    color: theme.premiumName,
    fontSize: 36,
    fontWeight: '800',
  },
  premiumDesc: {
    marginTop: 6,
    color: theme.premiumDesc,
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
    color: theme.benefitCheck,
    fontSize: 14,
    fontWeight: '800',
  },
  benefitText: {
    color: theme.benefitText,
    fontSize: 14,
    fontWeight: '500',
  },
  periodText: {
    marginTop: 8,
    color: theme.periodText,
    fontSize: 13,
  },
  button: {
    marginTop: 14,
    backgroundColor: theme.primaryBtnBg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.primaryBtnText,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: theme.secondaryBg,
    borderColor: theme.secondaryBorder,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: theme.secondaryText,
    fontWeight: '700',
    fontSize: 15,
  },
  cancelInfo: {
    marginTop: 10,
    color: theme.muted,
    fontSize: 13,
  },
  reactivateButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: theme.reactivateBg,
    borderWidth: 1,
    borderColor: theme.reactivateBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reactivateButtonText: {
    color: theme.reactivateText,
    fontWeight: '700',
    fontSize: 14,
  },
});