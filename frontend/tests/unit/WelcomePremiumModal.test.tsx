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
  const runStart = (cb?: Animated.EndCallback) => {
    if (typeof cb === 'function') cb({ finished: true });
  };

  const composite = (onStart?: (cb?: Animated.EndCallback) => void): Animated.CompositeAnimation => ({
    start: (cb) => {
      onStart?.(cb);
      runStart(cb);
    },
    stop: jest.fn(),
    reset: jest.fn(),
  });

  jest.spyOn(Animated, 'timing').mockImplementation(
    jest.fn<any>((value: Animated.Value, config: { toValue?: number }) =>
      composite((cb) => {
        if (config?.toValue !== undefined && value?.setValue) {
          value.setValue(config.toValue);
        }
        runStart(cb);
      })
    )
  );

  jest.spyOn(Animated, 'spring').mockImplementation(
    jest.fn<any>((value: Animated.Value, config: { toValue?: number }) =>
      composite((cb) => {
        if (config?.toValue !== undefined && value?.setValue) {
          value.setValue(config.toValue);
        }
        runStart(cb);
      })
    )
  );

  jest.spyOn(Animated, 'parallel').mockImplementation(
    jest.fn<any>((anims: Animated.CompositeAnimation[]) =>
      composite((cb) => {
        anims.forEach((a) => a.start?.());
        runStart(cb);
      })
    )
  );

  jest.spyOn(Animated, 'sequence').mockImplementation(
    jest.fn<any>((anims: Animated.CompositeAnimation[]) =>
      composite((cb) => {
        anims.forEach((a) => a.start?.());
        runStart(cb);
      })
    )
  );

  jest.spyOn(Animated, 'loop').mockImplementation(
    jest.fn<any>((anim: Animated.CompositeAnimation) =>
      composite(() => {
        anim.start?.();
      })
    )
  );
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
