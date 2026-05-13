import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { getPremiumModalPalette, type PremiumModalPalette } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

const { width: SW, height: SH } = Dimensions.get('window');

const smoothOut = Easing.bezier(0.0, 0.0, 0.2, 1);
const snapIn = Easing.bezier(0.34, 1.2, 0.64, 1);
const LIGHTWEIGHT_MODE = true;

interface ConfettiParticle {
  x: Animated.Value;
  y: Animated.Value;
  rot: Animated.Value;
  opacity: Animated.Value;
  color: string;
  w: number;
  h: number;
  isRect: boolean;
}

function buildConfetti(count: number, colors: string[]): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    x: new Animated.Value(SW / 2),
    y: new Animated.Value(SH * 0.34),
    rot: new Animated.Value(0),
    opacity: new Animated.Value(1),
    color: colors[i % colors.length],
    w: Math.random() > 0.4 ? Math.random() * 9 + 5 : Math.random() * 7 + 4,
    h: Math.random() > 0.4 ? Math.random() * 5 + 3 : 0,
    isRect: Math.random() > 0.4,
  }));
}

function launchConfetti(particles: ConfettiParticle[]) {
  const cx = SW / 2;
  const cy = SH * 0.34;
  const anims = particles.map((p) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 5;
    const dur = Math.random() * 900 + 1100;
    return Animated.parallel([
      Animated.timing(p.x, {
        toValue: cx + Math.cos(angle) * speed * SW * 0.068,
        duration: dur,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(p.y, {
        toValue: cy + Math.sin(angle) * speed * SH * 0.038 - SH * 0.2 + SH * 0.55,
        duration: dur,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(p.rot, {
        toValue: (Math.random() - 0.5) * 1440,
        duration: dur,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.delay(dur * 0.5),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: dur * 0.5,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]);
  });
  Animated.parallel(anims).start();
}

interface BgDot {
  left: number;
  top: number;
  size: number;
  opacity: Animated.Value;
}

function makeBgDots(n = 32): BgDot[] {
  return Array.from({ length: n }, () => ({
    left: Math.random() * SW,
    top: Math.random() * SH,
    size: Math.random() * 3 + 1,
    opacity: new Animated.Value(Math.random() * 0.22 + 0.05),
  }));
}

function pulseBgDots(dots: BgDot[]) {
  if (LIGHTWEIGHT_MODE) return;
  dots.forEach((d) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(d.opacity, {
          toValue: Math.random() * 0.35 + 0.1,
          duration: Math.random() * 2200 + 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(d.opacity, {
          toValue: Math.random() * 0.06 + 0.02,
          duration: Math.random() * 2200 + 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  });
}

function ShieldIcon({ pal }: { pal: PremiumModalPalette }) {
  return (
    <Svg width={130} height={142} viewBox="0 0 140 152" fill="none">
      <Defs>
        <LinearGradient id="shg" x1="70" y1="0" x2="70" y2="152" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={pal.shieldFillTop} />
          <Stop offset="100%" stopColor={pal.shieldFillBottom} />
        </LinearGradient>
        <LinearGradient id="shg2" x1="70" y1="20" x2="70" y2="130" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={pal.shieldInnerTop} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={pal.shieldInnerBottom} stopOpacity={0.4} />
        </LinearGradient>
        <LinearGradient id="shine" x1="30" y1="20" x2="90" y2="80" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="white" stopOpacity={0.22} />
          <Stop offset="100%" stopColor="white" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M70 6L12 28V72C12 106 38 134 70 146C102 134 128 106 128 72V28L70 6Z" fill="url(#shg)" />
      <Path d="M70 22L26 40V72C26 98 46 120 70 130C94 120 114 98 114 72V40L70 22Z" fill="url(#shg2)" />
      <Path d="M70 22L26 40V72C26 98 46 120 70 130C94 120 114 98 114 72V40L70 22Z" fill="url(#shine)" />
      <Path
        d="M70 6L12 28V72C12 106 38 134 70 146C102 134 128 106 128 72V28L70 6Z"
        fill="none"
        stroke={pal.shieldStroke}
        strokeWidth={1.5}
      />
      <Path
        d="M48 73L62 87L94 55"
        stroke="white"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface PerkRowProps {
  label: string;
  tx: Animated.Value;
  opacity: Animated.Value;
  pal: PremiumModalPalette;
}

function PerkRow({ label, tx, opacity, pal }: PerkRowProps) {
  return (
    <Animated.View
      style={[
        s.perkRow,
        {
          opacity,
          transform: [{ translateX: tx }],
          backgroundColor: pal.perkRowBg,
          borderColor: pal.perkRowBorder,
        },
      ]}
    >
      <View style={[s.perkIcon, { backgroundColor: pal.perkIconBg }]}>
        <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
          <Path
            d="M2 7l3.5 3.5L12 3"
            stroke={pal.perkCheckStroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={[s.perkLabel, { color: pal.perkLabel }]}>{label}</Text>
    </Animated.View>
  );
}

const PERKS = ['Sin anuncios, para siempre', 'Acceso ilimitado a funciones', 'Soporte prioritario'];

export interface WelcomePremiumModalProps {
  visible: boolean;
  onDismiss: () => void;
  mode?: 'new' | 'reactivated';
}

export function WelcomePremiumModal({
  visible,
  onDismiss,
  mode = 'reactivated',
}: WelcomePremiumModalProps) {
  const { colorblindFriendly } = useColorblindPreference();
  const pal = React.useMemo(() => getPremiumModalPalette(colorblindFriendly), [colorblindFriendly]);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const streakX = useRef(new Animated.Value(-SW * 0.7)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelY = useRef(new Animated.Value(-14)).current;
  const shieldScale = useRef(new Animated.Value(0.12)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const shieldRot = useRef(new Animated.Value(-10)).current;
  const shieldGlow = useRef(new Animated.Value(0)).current;
  const ringOScale = useRef(new Animated.Value(0.5)).current;
  const ringOOpacity = useRef(new Animated.Value(0)).current;
  const ringIScale = useRef(new Animated.Value(0.5)).current;
  const ringIOpacity = useRef(new Animated.Value(0)).current;
  const t1Opacity = useRef(new Animated.Value(0)).current;
  const t1Y = useRef(new Animated.Value(30)).current;
  const t2Opacity = useRef(new Animated.Value(0)).current;
  const t2Y = useRef(new Animated.Value(22)).current;
  const divW = useRef(new Animated.Value(0)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const subY = useRef(new Animated.Value(12)).current;
  const pOps = useRef(PERKS.map(() => new Animated.Value(0))).current;
  const pTxs = useRef(PERKS.map(() => new Animated.Value(-32))).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(0.82)).current;

  const confetti = useRef<ConfettiParticle[]>([]);
  const bgDots = useRef<BgDot[]>([]);
  const [, setTick] = React.useState(0);
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const reset = useCallback(() => {
    glowLoop.current?.stop();
    overlayOpacity.setValue(0);
    streakX.setValue(-SW * 0.7);
    labelOpacity.setValue(0);
    labelY.setValue(-14);
    shieldScale.setValue(0.12);
    shieldOpacity.setValue(0);
    shieldRot.setValue(-10);
    shieldGlow.setValue(0);
    ringOScale.setValue(0.5);
    ringOOpacity.setValue(0);
    ringIScale.setValue(0.5);
    ringIOpacity.setValue(0);
    t1Opacity.setValue(0);
    t1Y.setValue(30);
    t2Opacity.setValue(0);
    t2Y.setValue(22);
    divW.setValue(0);
    subOpacity.setValue(0);
    subY.setValue(12);
    pOps.forEach((v) => v.setValue(0));
    pTxs.forEach((v) => v.setValue(-32));
    ctaOpacity.setValue(0);
    ctaScale.setValue(0.82);
    confetti.current = [];
  }, [
    ctaOpacity,
    ctaScale,
    divW,
    labelOpacity,
    labelY,
    overlayOpacity,
    pOps,
    pTxs,
    ringIOpacity,
    ringIScale,
    ringOOpacity,
    ringOScale,
    shieldGlow,
    shieldOpacity,
    shieldRot,
    shieldScale,
    streakX,
    subOpacity,
    subY,
    t1Opacity,
    t1Y,
    t2Opacity,
    t2Y,
  ]);

  const run = useCallback(() => {
    Vibration.vibrate([0, 24, 42, 38]);

    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 360,
      easing: smoothOut,
      useNativeDriver: false,
    }).start();

    Animated.timing(streakX, {
      toValue: SW * 1.2,
      duration: 680,
      easing: smoothOut,
      useNativeDriver: false,
    }).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 420,
          easing: smoothOut,
          useNativeDriver: false,
        }),
        Animated.timing(labelY, {
          toValue: 0,
          duration: 440,
          easing: smoothOut,
          useNativeDriver: false,
        }),
      ]).start();
    }, 80);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(shieldScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: false }),
        Animated.timing(shieldOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(shieldRot, {
          toValue: 0,
          duration: 540,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }, 200);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(ringOScale, { toValue: 1, friction: 5, tension: 65, useNativeDriver: false }),
        Animated.timing(ringOOpacity, { toValue: 1, duration: 340, useNativeDriver: false }),
        Animated.spring(ringIScale, { toValue: 1, friction: 6, tension: 75, useNativeDriver: false }),
        Animated.timing(ringIOpacity, { toValue: 1, duration: 280, useNativeDriver: false }),
      ]).start();

      if (!LIGHTWEIGHT_MODE) {
        confetti.current = buildConfetti(85, pal.confetti);
        setTick((v) => v + 1);
        launchConfetti(confetti.current);

        glowLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(shieldGlow, {
              toValue: 1,
              duration: 1100,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(shieldGlow, {
              toValue: 0.35,
              duration: 1100,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
        glowLoop.current.start();
      } else {
        confetti.current = buildConfetti(24, pal.confetti);
        setTick((v) => v + 1);
        launchConfetti(confetti.current);
      }
    }, 660);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(t1Opacity, {
          toValue: 1,
          duration: 400,
          easing: smoothOut,
          useNativeDriver: false,
        }),
        Animated.timing(t1Y, {
          toValue: 0,
          duration: 440,
          easing: snapIn,
          useNativeDriver: false,
        }),
      ]).start();
    }, 790);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(t2Opacity, {
          toValue: 1,
          duration: 380,
          easing: smoothOut,
          useNativeDriver: false,
        }),
        Animated.timing(t2Y, {
          toValue: 0,
          duration: 420,
          easing: snapIn,
          useNativeDriver: false,
        }),
      ]).start();
    }, 940);

    setTimeout(() => {
      Animated.timing(divW, {
        toValue: 200,
        duration: 500,
        easing: smoothOut,
        useNativeDriver: false,
      }).start();
    }, 1060);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subOpacity, {
          toValue: 1,
          duration: 400,
          easing: smoothOut,
          useNativeDriver: false,
        }),
        Animated.timing(subY, {
          toValue: 0,
          duration: 400,
          easing: smoothOut,
          useNativeDriver: false,
        }),
      ]).start();
    }, 1190);

    PERKS.forEach((_, i) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(pOps[i], {
            toValue: 1,
            duration: 380,
            easing: smoothOut,
            useNativeDriver: false,
          }),
          Animated.spring(pTxs[i], { toValue: 0, friction: 6, tension: 80, useNativeDriver: false }),
        ]).start();
      }, 1320 + i * 100);
    });

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 400,
          easing: smoothOut,
          useNativeDriver: false,
        }),
        Animated.spring(ctaScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: false }),
      ]).start();
    }, 1660);
  }, [
    ctaOpacity,
    ctaScale,
    divW,
    labelOpacity,
    labelY,
    overlayOpacity,
    pOps,
    pTxs,
    pal,
    ringIOpacity,
    ringIScale,
    ringOOpacity,
    ringOScale,
    shieldGlow,
    shieldOpacity,
    shieldRot,
    shieldScale,
    streakX,
    subOpacity,
    subY,
    t1Opacity,
    t1Y,
    t2Opacity,
    t2Y,
  ]);

  useEffect(() => {
    if (!visible) {
      glowLoop.current?.stop();
      return;
    }
    reset();
    bgDots.current = makeBgDots(LIGHTWEIGHT_MODE ? 10 : 32);
    pulseBgDots(bgDots.current);
    const t = setTimeout(run, 60);
    return () => {
      clearTimeout(t);
      glowLoop.current?.stop();
    };
  }, [reset, run, visible]);

  const dismiss = useCallback(() => {
    glowLoop.current?.stop();
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 340,
      easing: Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start(onDismiss);
  }, [onDismiss, overlayOpacity]);

  const titleMain = '¡Bienvenido';
  const titleAccent = mode === 'new' ? 'a Premium!' : 'de vuelta!';
  const caption =
    mode === 'new' ? 'Todo desbloqueado desde ahora.' : 'Tu suscripción está activa de nuevo.';

  const glowR = shieldGlow.interpolate({ inputRange: [0, 1], outputRange: [8, 24] });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
        {!LIGHTWEIGHT_MODE &&
          bgDots.current.map((d, i) => (
          <Animated.View
            key={`${d.left}-${d.top}-${i}`}
            style={{
              position: 'absolute',
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: pal.dot,
              opacity: d.opacity,
            }}
          />
        ))}

        <Animated.View
          pointerEvents="none"
          style={[s.streak, { backgroundColor: pal.streak, transform: [{ translateX: streakX }] }]}
        />

        {confetti.current.map((p, i) => (
          <Animated.View
            key={`cf-${i}`}
            style={{
              position: 'absolute',
              width: p.w,
              height: p.isRect ? p.h : p.w,
              borderRadius: p.isRect ? 2 : p.w / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rot.interpolate({
                    inputRange: [-1440, 1440],
                    outputRange: ['-1440deg', '1440deg'],
                  }),
                },
              ],
            }}
          />
        ))}

        <View style={s.content}>
          <Animated.Text
            style={[s.eyebrow, { color: pal.eyebrow, opacity: labelOpacity, transform: [{ translateY: labelY }] }]}
          >
            E-GO PREMIUM
          </Animated.Text>

          <View style={s.shieldArea}>
            <Animated.View
              style={[
                s.ringO,
                {
                  borderColor: ringOOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [pal.ringTransparent, pal.ringOVisible],
                  }),
                  transform: [{ scale: ringOScale }],
                  opacity: ringOOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                s.ringI,
                {
                  borderColor: ringIOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [pal.ringTransparent, pal.ringIVisible],
                  }),
                  transform: [{ scale: ringIScale }],
                  opacity: ringIOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                s.shieldWrap,
                {
                  shadowColor: pal.shieldWrapShadow,
                  opacity: shieldOpacity,
                  shadowRadius: glowR,
                  transform: [
                    { scale: shieldScale },
                    {
                      rotate: shieldRot.interpolate({
                        inputRange: [-10, 0],
                        outputRange: ['-10deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ShieldIcon pal={pal} />
            </Animated.View>
          </View>

          <Animated.Text style={[s.titleMain, { opacity: t1Opacity, transform: [{ translateY: t1Y }] }]}>
            {titleMain}
          </Animated.Text>
          <Animated.Text
            style={[s.titleAccent, { color: pal.titleAccent, opacity: t2Opacity, transform: [{ translateY: t2Y }] }]}
          >
            {titleAccent}
          </Animated.Text>

          <Animated.View style={[s.divider, { width: divW, backgroundColor: pal.divider }]} />

          <Animated.Text
            style={[s.caption, { color: pal.caption, opacity: subOpacity, transform: [{ translateY: subY }] }]}
          >
            {caption}
          </Animated.Text>

          <View style={s.perks}>
            {PERKS.map((label, i) => (
              <PerkRow key={label} label={label} opacity={pOps[i]} tx={pTxs[i]} pal={pal} />
            ))}
          </View>

          <Animated.View style={{ opacity: ctaOpacity, transform: [{ scale: ctaScale }], width: '100%' }}>
            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                s.cta,
                { backgroundColor: pal.ctaBg, shadowColor: pal.ctaShadow },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={[s.ctaText, { color: pal.ctaText }]}>Continuar</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#020d18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streak: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SW * 0.55,
    height: SH,
    backgroundColor: 'rgba(134,239,172,0.055)',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#4ade80',
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  shieldArea: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  ringO: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  ringI: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
  },
  shieldWrap: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
    elevation: 12,
  },
  titleMain: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fef08a',
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 44,
  },
  titleAccent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#86efac',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#4ade80',
    opacity: 0.3,
    borderRadius: 1,
    marginVertical: 18,
  },
  caption: {
    fontSize: 15,
    fontWeight: '500',
    color: '#a7f3d0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  perks: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(74,222,128,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.15)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  perkIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(74,222,128,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1fae5',
    letterSpacing: 0.2,
  },
  cta: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#052e16',
    letterSpacing: 0.5,
  },
});
