import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type MagicRingsBackgroundProps = {
  color: string;
  colorTwo: string;
  ringCount: number;
  speed: number;
  opacity: number;
  fullScreen: boolean;
};

type RingStrokeProps = {
  index: number;
  ringCount: number;
  clock: { current: number };
  centerX: number;
  centerY: number;
  baseRadius: number;
  scaleRate: number;
  globalOpacity: number;
  color: string;
  speed: number;
  skia: NonNullable<typeof skiaModule>;
};

const STROKE_LAYERS = [
  { width: 8, opacity: 0.08 },
  { width: 4, opacity: 0.18 },
  { width: 1.5, opacity: 1.0 },
] as const;

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized;
  const parsed = Number.parseInt(value, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function mixColor(c1: string, c2: string, t: number) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const clampT = Math.min(1, Math.max(0, t));
  const r = Math.round(a.r + (b.r - a.r) * clampT);
  const g = Math.round(a.g + (b.g - a.g) * clampT);
  const bValue = Math.round(a.b + (b.b - a.b) * clampT);
  return `rgb(${r}, ${g}, ${bValue})`;
}

function withOpacity(rgb: string, alpha: number) {
  return rgb.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
}

const skiaModule = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@shopify/react-native-skia');
  } catch {
    return null;
  }
})();

function RingStroke({
  index,
  ringCount,
  clock,
  centerX,
  centerY,
  baseRadius,
  scaleRate,
  globalOpacity,
  color,
  speed,
  skia,
}: RingStrokeProps) {
  const { Group, Circle, useComputedValue } = skia;
  const cycle = 3.45;
  const radius = useComputedValue(() => {
    const t = (clock.current / 1000) * speed;
    const phaseOffset = (index * cycle) / Math.max(ringCount, 1);
    const progress = ((t + phaseOffset) % cycle) / cycle;
    return baseRadius + progress * scaleRate;
  }, [clock, speed, index, ringCount, baseRadius, scaleRate]);

  const opacity = useComputedValue(() => {
    const t = (clock.current / 1000) * speed;
    const phaseOffset = (index * cycle) / Math.max(ringCount, 1);
    const progress = ((t + phaseOffset) % cycle) / cycle;
    const fadeIn = progress < 0.2 ? progress / 0.2 : 1;
    const fadeOut = progress > 0.7 ? (1 - progress) / 0.3 : 1;
    const localOpacity = Math.max(0, Math.min(1, Math.min(fadeIn, fadeOut)));
    return localOpacity * globalOpacity;
  }, [clock, speed, index, ringCount, globalOpacity]);

  return (
    <Group opacity={opacity}>
      {STROKE_LAYERS.map((layer, layerIndex) => (
        <Circle
          key={`ring-${index}-layer-${layerIndex}`}
          cx={centerX}
          cy={centerY}
          r={radius}
          color={withOpacity(color, layer.opacity)}
          style="stroke"
          strokeWidth={layer.width}
        />
      ))}
    </Group>
  );
}

type FallbackRingProps = {
  index: number;
  ringCount: number;
  size: number;
  color: string;
  speed: number;
  opacity: number;
};

function FallbackRing({
  index,
  ringCount,
  size,
  color,
  speed,
  opacity,
}: FallbackRingProps) {
  const progress = useSharedValue(0);
  const delayMs = Math.round((index / Math.max(ringCount, 1)) * 3000);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: Math.max(1200, Math.round(3200 / Math.max(speed, 0.2))),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [progress, speed]);

  const animatedStyle = useAnimatedStyle(() => {
    const shifted = (progress.value + delayMs / 3000) % 1;
    const fade = interpolate(shifted, [0, 0.2, 0.7, 1], [0, 1, 1, 0]);
    const scale = interpolate(shifted, [0, 1], [0.55, 1.4]);
    return {
      opacity: fade * opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.fallbackRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function MagicRingsBackground({
  color,
  colorTwo,
  ringCount,
  speed,
  opacity,
  fullScreen,
}: MagicRingsBackgroundProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [localSize, setLocalSize] = useState({ width: 0, height: 0 });

  const width = fullScreen ? windowWidth : localSize.width;
  const height = fullScreen ? windowHeight : localSize.height;

  const minSide = Math.max(1, Math.min(width || 1, height || 1));
  const baseRadius = minSide * 0.16;
  const scaleRate = minSide * 0.6;
  const centerX = width / 2;
  const centerY = height / 2;

  const ringColors = useMemo(() => {
    const denominator = Math.max(1, ringCount - 1);
    return Array.from({ length: ringCount }, (_, i) =>
      mixColor(color, colorTwo, i / denominator)
    );
  }, [color, colorTwo, ringCount]);

  const onLayout = (event: LayoutChangeEvent) => {
    if (fullScreen) return;
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setLocalSize((prev) =>
      prev.width === nextWidth && prev.height === nextHeight
        ? prev
        : { width: nextWidth, height: nextHeight }
    );
  };

  return (
    <View
      style={[styles.container, fullScreen ? styles.fullScreen : styles.fillParent]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {width > 0 && height > 0 ? (
        skiaModule ? (
          <SkiaCanvasLayer
            centerX={centerX}
            centerY={centerY}
            baseRadius={baseRadius}
            scaleRate={scaleRate}
            ringCount={ringCount}
            ringColors={ringColors}
            opacity={opacity}
            speed={speed}
            skia={skiaModule}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            {ringColors.map((ringColor, index) => (
              <FallbackRing
                key={`fallback-ring-${index}`}
                index={index}
                ringCount={ringCount}
                size={baseRadius * 2 + index * 26}
                color={ringColor}
                speed={speed}
                opacity={opacity}
              />
            ))}
          </View>
        )
      ) : null}
    </View>
  );
}

type SkiaCanvasLayerProps = {
  centerX: number;
  centerY: number;
  baseRadius: number;
  scaleRate: number;
  ringCount: number;
  ringColors: string[];
  opacity: number;
  speed: number;
  skia: NonNullable<typeof skiaModule>;
};

function SkiaCanvasLayer({
  centerX,
  centerY,
  baseRadius,
  scaleRate,
  ringCount,
  ringColors,
  opacity,
  speed,
  skia,
}: SkiaCanvasLayerProps) {
  const { Canvas, useClockValue } = skia;
  const clock = useClockValue();

  return (
    <Canvas style={styles.canvas}>
      {ringColors.map((ringColor, index) => (
        <RingStroke
          key={`ring-${index}`}
          index={index}
          ringCount={ringCount}
          clock={clock}
          centerX={centerX}
          centerY={centerY}
          baseRadius={baseRadius}
          scaleRate={scaleRate}
          globalOpacity={opacity}
          color={ringColor}
          speed={speed}
          skia={skia}
        />
      ))}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  fillParent: {
    width: '100%',
    height: '100%',
  },
  canvas: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
    shadowColor: '#85f755',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});

