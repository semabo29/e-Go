import {
  Extrapolation,
  interpolate,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

type UseRingsAnimationParams = {
  ringCount: number;
  speed: number;
  cycle?: number;
  baseRadius?: number;
  scaleRate?: number;
};

export type RingAnimationSnapshot = {
  progress: number;
  radius: number;
  opacity: number;
};

const DEFAULT_CYCLE = 3.45;
const DEFAULT_BASE_RADIUS = 56;
const DEFAULT_SCALE_RATE = 168;

export function useRingsAnimation({
  ringCount,
  speed,
  cycle = DEFAULT_CYCLE,
  baseRadius = DEFAULT_BASE_RADIUS,
  scaleRate = DEFAULT_SCALE_RATE,
}: UseRingsAnimationParams) {
  const elapsed = useSharedValue(0);
  const frameStep = useSharedValue(1 / 60);

  useFrameCallback((frame) => {
    'worklet';
    const dtMs = frame.timeSincePreviousFrame ?? 16.6667;
    const dt = Math.max(dtMs / 1000, frameStep.value);
    elapsed.value = (elapsed.value + dt * speed) % cycle;
  });

  const getRingValues = (index: number): RingAnimationSnapshot => {
    'worklet';
    const phaseOffset = (index * cycle) / Math.max(ringCount, 1);
    const progress = ((elapsed.value + phaseOffset) % cycle) / cycle;
    const radius = baseRadius + progress * scaleRate;
    const opacity = interpolate(
      progress,
      [0, 0.2, 0.7, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    );

    return { progress, radius, opacity };
  };

  const clock = useDerivedValue(() => elapsed.value);

  return {
    elapsed,
    clock,
    cycle,
    getRingValues,
  };
}

