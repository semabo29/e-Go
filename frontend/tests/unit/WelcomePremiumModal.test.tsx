import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Animated, Vibration } from 'react-native';

const mockUseColorblindPreference = jest.fn(() => ({ colorblindFriendly: false }));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => mockUseColorblindPreference(),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = (props: { children?: React.ReactNode }) =>
    React.createElement(View, props);
  return {
    __esModule: true,
    default: Mock,
    Svg: Mock,
    Defs: Mock,
    LinearGradient: Mock,
    Stop: Mock,
    Path: Mock,
  };
});

import { WelcomePremiumModal } from '@/components/WelcomePremiumModal';

function patchAnimated() {
  const runStart = (cb?: (() => void) | { finished?: boolean }) => {
    if (typeof cb === 'function') cb();
  };

  jest.spyOn(Animated, 'timing').mockImplementation(((value: Animated.Value, config: { toValue?: number }) => {
    return {
      start: (cb?: (() => void) | { finished?: boolean }) => {
        if (config?.toValue !== undefined && value?.setValue) {
          value.setValue(config.toValue);
        }
        runStart(cb);
      },
    };
  }) as typeof Animated.timing);

  jest.spyOn(Animated, 'spring').mockImplementation(((value: Animated.Value, config: { toValue?: number }) => {
    return {
      start: (cb?: (() => void) | { finished?: boolean }) => {
        if (config?.toValue !== undefined && value?.setValue) {
          value.setValue(config.toValue);
        }
        runStart(cb);
      },
    };
  }) as typeof Animated.spring);

  jest.spyOn(Animated, 'parallel').mockImplementation(((anims: { start: (cb?: () => void) => void }[]) => ({
    start: (cb?: () => void) => {
      anims.forEach((a) => a.start?.());
      runStart(cb);
    },
  })) as typeof Animated.parallel);

  jest.spyOn(Animated, 'sequence').mockImplementation(((anims: { start: (cb?: () => void) => void }[]) => ({
    start: (cb?: () => void) => {
      anims.forEach((a) => a.start?.());
      runStart(cb);
    },
  })) as typeof Animated.sequence);

  jest.spyOn(Animated, 'loop').mockImplementation(((anim: { start: (cb?: () => void) => void; stop?: () => void }) => ({
    start: () => anim.start?.(),
    stop: jest.fn(),
  })) as typeof Animated.loop);
}

describe('WelcomePremiumModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    patchAnimated();
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('no monta contenido cuando visible es false', () => {
    const { queryByText } = render(
      <WelcomePremiumModal visible={false} onDismiss={jest.fn()} />
    );
    expect(queryByText('Continuar')).toBeNull();
  });

  test('modo new muestra titulo de bienvenida a Premium', async () => {
    const { findByText } = render(
      <WelcomePremiumModal visible onDismiss={jest.fn()} mode="new" />
    );

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(await findByText('a Premium!')).toBeTruthy();
    expect(await findByText('Todo desbloqueado desde ahora.')).toBeTruthy();
  });

  test('modo reactivated muestra texto de vuelta', async () => {
    const { findByText } = render(
      <WelcomePremiumModal visible onDismiss={jest.fn()} mode="reactivated" />
    );

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(await findByText('de vuelta!')).toBeTruthy();
    expect(await findByText('Tu suscripción está activa de nuevo.')).toBeTruthy();
  });

  test('lista beneficios premium', async () => {
    const { findByText } = render(
      <WelcomePremiumModal visible onDismiss={jest.fn()} />
    );

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(await findByText('Sin anuncios, para siempre')).toBeTruthy();
    expect(await findByText('Soporte prioritario')).toBeTruthy();
  });

  test('Continuar llama onDismiss tras animación', async () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <WelcomePremiumModal visible onDismiss={onDismiss} />
    );

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.press(getByText('Continuar'));

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(onDismiss).toHaveBeenCalled();
    expect(Vibration.vibrate).toHaveBeenCalled();
  });

  test('renderiza con paleta daltonismo', async () => {
    mockUseColorblindPreference.mockReturnValue({ colorblindFriendly: true });
    const { findByText } = render(
      <WelcomePremiumModal visible onDismiss={jest.fn()} mode="new" />
    );

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(await findByText('E-GO PREMIUM')).toBeTruthy();
    mockUseColorblindPreference.mockReturnValue({ colorblindFriendly: false });
  });

  test('al ocultar visible detiene animaciones pendientes', async () => {
    const { rerender, queryByText } = render(
      <WelcomePremiumModal visible onDismiss={jest.fn()} />
    );

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    rerender(<WelcomePremiumModal visible={false} onDismiss={jest.fn()} />);

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(queryByText('Continuar')).toBeNull();
  });
});
