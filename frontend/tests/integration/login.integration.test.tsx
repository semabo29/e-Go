import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import LoginScreen from '@/app/login';

const mockSetUser = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockHasPlayServices = jest.fn();
const mockSignIn = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    setUser: mockSetUser,
    user: null,
    logout: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    signIn: (...args: unknown[]) => mockSignIn(...args),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
  },
}));

describe('LoginScreen integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPlayServices.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({ idToken: 'google-token' });
    globalThis.fetch = jest.fn(async (url: string) => {
      if (url.includes('/auth/google')) {
        return {
          ok: true,
          json: async () => ({
            user: { id: 1, email: 'google@test.com', username: 'google' },
          }),
        } as Response;
      }
      return {
        ok: false,
        json: async () => ({ error: 'Unexpected URL' }),
      } as Response;
    }) as unknown as typeof fetch;
  });

  test('login local con credenciales válidas navega a tabs', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/auth/local/login')) {
        return {
          ok: true,
          json: async () => ({
            user: { id: 8, email: 'local@test.com', username: 'local' },
          }),
        } as Response;
      }
      if (url.includes('/auth/google')) {
        return { ok: true, json: async () => ({ user: null }) } as Response;
      }
      return { ok: false, json: async () => ({ error: 'Unexpected URL' }) } as Response;
    });

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.changeText(getByPlaceholderText('Email'), 'local@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'secret123');
    fireEvent.press(getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'local@test.com' })
      );
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  test('registro local muestra error cuando falta username', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.press(getByText('¿No tienes cuenta? Regístrate con mail'));
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'secret123');
    fireEvent.changeText(getByPlaceholderText('Confirmar contraseña'), 'secret123');
    fireEvent.press(getByText('Crear cuenta'));

    await waitFor(() => {
      expect(getByText('El nombre de usuario es obligatorio')).toBeTruthy();
    });
  });

  test('registro local muestra error si contraseñas no coinciden', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.press(getByText('¿No tienes cuenta? Regístrate con mail'));
    fireEvent.changeText(getByPlaceholderText('Nombre de usuario'), 'newuser');
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'secret123');
    fireEvent.changeText(getByPlaceholderText('Confirmar contraseña'), 'secret321');
    fireEvent.press(getByText('Crear cuenta'));

    await waitFor(() => {
      expect(getByText('Las contraseñas no coinciden')).toBeTruthy();
    });
  });
});
