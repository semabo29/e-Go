import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const sharedElapsed = { value: 0 };
const frameCallbacks: Array<(frame: { timeSincePreviousFrame?: number }) => void> = [];

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  useSharedValue: (initial: number) => {
    sharedElapsed.value = initial;
    return sharedElapsed;
  },
  useFrameCallback: (cb: (frame: { timeSincePreviousFrame?: number }) => void) => {
    frameCallbacks.push(cb);
    cb({ timeSincePreviousFrame: 16.6667 });
  },
  useDerivedValue: (fn: () => number) => ({ value: fn() }),
  interpolate: (
    value: number,
    inputRange: number[],
    outputRange: number[],
    _extrapolation?: unknown
  ) => {
    if (value <= inputRange[0]) return outputRange[0];
    if (value >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
    return outputRange[1];
  },
  Extrapolation: { CLAMP: 'clamp' },
}));

import { useRingsAnimation } from '@/hooks/useRingsAnimation';
import { renderHook } from '@testing-library/react-native';

describe('useRingsAnimation', () => {
  beforeEach(() => {
    sharedElapsed.value = 0;
    frameCallbacks.length = 0;
    jest.clearAllMocks();
  });

  test('expone elapsed, clock, cycle y getRingValues', () => {
    const { result } = renderHook(() =>
      useRingsAnimation({ ringCount: 4, speed: 1 })
    );

    expect(result.current.cycle).toBe(3.45);
    expect(result.current.elapsed).toBe(sharedElapsed);
    expect(result.current.clock.value).toBeDefined();
    expect(typeof result.current.getRingValues).toBe('function');
  });

  test('getRingValues devuelve progress, radius y opacity', () => {
    const { result } = renderHook(() =>
      useRingsAnimation({
        ringCount: 3,
        speed: 2,
        cycle: 10,
        baseRadius: 40,
        scaleRate: 100,
      })
    );

    const snapshot = result.current.getRingValues(0);
    expect(snapshot.progress).toBeGreaterThanOrEqual(0);
    expect(snapshot.progress).toBeLessThanOrEqual(1);
    expect(snapshot.radius).toBeGreaterThanOrEqual(40);
    expect(snapshot.opacity).toBeGreaterThanOrEqual(0);
    expect(snapshot.opacity).toBeLessThanOrEqual(1);
  });

  test('useFrameCallback avanza elapsed según speed', () => {
    renderHook(() => useRingsAnimation({ ringCount: 2, speed: 3, cycle: 5 }));

    expect(frameCallbacks.length).toBeGreaterThan(0);
    expect(sharedElapsed.value).toBeGreaterThan(0);
    expect(sharedElapsed.value).toBeLessThan(5);
  });

  test('getRingValues usa fases distintas por índice', () => {
    const { result } = renderHook(() =>
      useRingsAnimation({ ringCount: 4, speed: 1, cycle: 8 })
    );

    const a = result.current.getRingValues(0);
    const b = result.current.getRingValues(2);
    expect(a.progress).not.toBe(b.progress);
  });
});
