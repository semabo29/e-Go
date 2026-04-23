import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MagicRingsBackground from '../components/MagicRingsBackground';

type PlanSelectionScreenProps = {
  currentPlan: 'free' | 'premium';
  onSubscribePress?: () => void;
  onContinueFreePress?: () => void;
  onChangeToFreePress?: () => void;
};

const BENEFITS = [
  'Sin anuncios',
  'Acceso ilimitado a todas las funciones',
  'Soporte prioritario',
  'Actualizaciones anticipadas',
  'Exportación de datos',
];

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>✓</Text>
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export default function PlanSelectionScreen({
  currentPlan,
  onSubscribePress,
  onContinueFreePress,
  onChangeToFreePress,
}: PlanSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const ctaWidth = Math.min(Math.max(width * 0.8, 240), 420);
  const premiumHeroHeight = Math.max(220, Math.round(height * 0.35));

  if (currentPlan === 'free') {
    return (
      <View style={styles.freeContainer}>
        <MagicRingsBackground
          color="#85f755"
          colorTwo="#63f187"
          ringCount={6}
          speed={1}
          opacity={1}
          fullScreen
        />

        <View
          style={[
            styles.freeOverlay,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
          ]}
        >
          <View style={styles.pill}>
            <Text style={styles.pillText}>PREMIUM</Text>
          </View>
          <Text style={styles.priceText}>4,99€/mes</Text>
          <Text style={styles.subText}>Accede a todas las funciones sin límites</Text>

          <View style={styles.bottomCtaWrap}>
            <Pressable
              style={[styles.ctaButton, { width: ctaWidth }]}
              onPress={onSubscribePress}
            >
              <Text style={styles.ctaText}>Suscribirme ahora</Text>
            </Pressable>
            <Pressable
              style={styles.freeLinkPressable}
              onPress={onContinueFreePress}
            >
              <Text style={styles.freeLinkText}>Continuar con el plan gratuito</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.premiumRoot}>
      <View style={[styles.premiumHero, { height: premiumHeroHeight, paddingTop: insets.top }]}>
        <MagicRingsBackground
          color="#85f755"
          colorTwo="#63f187"
          ringCount={5}
          speed={0.9}
          opacity={0.7}
          fullScreen={false}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.premiumContent,
          {
            paddingBottom: insets.bottom + 24,
            marginTop: isLandscape ? 8 : -8,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.premiumCard}>
          <Text style={styles.premiumHeader}>Tu plan Premium ✦</Text>
          <Text style={styles.premiumSubtitle}>Activo · Renovación el 20 de mayo</Text>
          <View style={styles.divider} />
          {BENEFITS.map((benefit) => (
            <BenefitRow key={benefit} text={benefit} />
          ))}
        </View>

        <View style={styles.freeCard}>
          <Text style={styles.freeCardText}>Plan Gratuito — funciones básicas</Text>
          <Pressable style={styles.ghostButton} onPress={onChangeToFreePress}>
            <Text style={styles.ghostButtonText}>Cambiar a gratuito</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  freeContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  freeOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(133,247,85,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(133,247,85,0.08)',
    marginBottom: 20,
  },
  pillText: {
    color: '#85f755',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
  },
  subText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomCtaWrap: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  ctaButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#85f755',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  freeLinkPressable: {
    marginTop: 16,
  },
  freeLinkText: {
    color: '#666666',
    fontSize: 13,
  },
  premiumRoot: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  premiumHero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  premiumCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 16,
    padding: 16,
  },
  premiumHeader: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  premiumSubtitle: {
    color: '#76d890',
    fontSize: 13,
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.17)',
    marginVertical: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#85f755',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkText: {
    color: '#0a0a0a',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 15,
  },
  benefitText: {
    color: '#ffffff',
    fontSize: 15,
    flex: 1,
  },
  freeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#161616',
    padding: 14,
  },
  freeCardText: {
    color: '#555555',
    fontSize: 14,
    marginBottom: 12,
  },
  ghostButton: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
  },
});

