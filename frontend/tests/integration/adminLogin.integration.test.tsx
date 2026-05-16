import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn();
const mockSearchParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn(() => [{ codeVerifier: 'verifier' }, null, jest.fn()]),
  useAutoDiscovery: jest.fn(() => ({})),
  makeRedirectUri: jest.fn(() => 'test://redirect'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('@/constants/api', () => ({
  getApiUrl: jest.fn(() => 'http://test.api'),
  GOOGLE_WEB_CLIENT_ID: 'test-client-id',
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => ({ colorblindFriendly: false }),
}));

const mockSavePrivilegedSession = jest.fn();
jest.mock('@/services/privilegedAuth', () => ({
  savePrivilegedSession: (...args: any[]) => mockSavePrivilegedSession(...args),
}));

import AdminLoginScreen from '@/app/admin-login';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

describe('AdminLoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSearchParams).forEach((k) => delete mockSearchParams[k]);
    mockSavePrivilegedSession.mockResolvedValue(undefined);
    globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  test('renders title and email input', () => {
    const { getByText, getByPlaceholderText } = render(<AdminLoginScreen />);
    expect(getByText('Acceso Admin')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
  });

  test('shows error on empty email submit', async () => {
    const { getByText, findByText } = render(<AdminLoginScreen />);
    fireEvent.press(getByText(/Iniciar/));
    await findByText(/obligatorios/);
  });

  test('local login success navigates to admin-home', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        admin: { id: 1, email: 'admin@test.com', username: 'admin' },
        token: 'jwt-token',
      }),
    } as Response);

    const { getByPlaceholderText, getByText } = render(<AdminLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'admin@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass123');
    fireEvent.press(getByText(/Iniciar/));

    await waitFor(() => {
      expect(mockSavePrivilegedSession).toHaveBeenCalledWith(
        'admin',
        expect.objectContaining({ token: 'jwt-token' })
      );
      expect(mockReplace).toHaveBeenCalledWith('/admin-home');
    });
  });

  test('local login failure shows error detail', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Credenciales invalidas', message: '' }),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<AdminLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'bad@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'wrong');
    fireEvent.press(getByText(/Iniciar/));
    await findByText('Credenciales invalidas');
  });

  test('local login failure shows fallback error when no detail', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<AdminLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'bad@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'wrong');
    fireEvent.press(getByText(/Iniciar/));
    await findByText(/Error al iniciar/);
  });

  test('network error shows connection error', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network error'));

    const { getByPlaceholderText, getByText, findByText } = render(<AdminLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'admin@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass');
    fireEvent.press(getByText(/Iniciar/));
    await findByText(/servidor/);
  });

  test('back link navigates to login', async () => {
    const { getByText } = render(<AdminLoginScreen />);
    fireEvent.press(getByText('Volver al login'));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  test('login does not call API when token not in response', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const { getByPlaceholderText, getByText } = render(<AdminLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'admin@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass');
    fireEvent.press(getByText(/Iniciar/));

    await waitFor(() => {
      expect(mockSavePrivilegedSession).not.toHaveBeenCalled();
    });
  });

  test('shows success box with email after local login', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        admin: { id: 1, email: 'admin@test.com', username: 'admin' },
        token: 'jwt-token',
      }),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<AdminLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'admin@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass123');
    fireEvent.press(getByText(/Iniciar/));
    await findByText('Sesion iniciada');
    expect(getByText('admin@test.com')).toBeTruthy();
  });

  test('Ir a la app button navigates to tabs', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        admin: { id: 1, email: 'admin@test.com', username: 'admin' },
        token: 'jwt-token',
      }),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<AdminLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'admin@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass123');
    fireEvent.press(getByText(/Iniciar/));
    await findByText('Ir a la app');
    fireEvent.press(getByText('Ir a la app'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  describe('Google Native sign-in (handleAdminLogin)', () => {
    test('successful Google sign-in calls API with idToken and navigates', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ idToken: 'google-id-token' });
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          admin: { id: 1, email: 'admin@g.com', username: 'gadmin' },
          token: 'jwt-google',
        }),
      } as Response);

      const { getByText, findByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('Sesion iniciada');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/google'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('Google sign-in with no idToken shows error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({});
      const { getByText, findByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('No se pudo obtener el token de Google');
    });

    test('Google sign-in API failure shows error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ idToken: 'token' });
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'No autorizado' }),
      } as Response);
      const { getByText, findByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('No autorizado');
    });

    test('Google sign-in API with no admin in response does not navigate', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ idToken: 'token' });
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);
      const { getByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await waitFor(() => {
        expect(mockSavePrivilegedSession).not.toHaveBeenCalled();
      });
    });

    test('Google sign-in cancelled - no error shown', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue({ code: statusCodes.SIGN_IN_CANCELLED });
      const { getByText, queryByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await waitFor(() => {
        expect(GoogleSignin.signIn).toHaveBeenCalled();
      });
      expect(queryByText(/error/i)).toBeNull();
    });

    test('Google sign-in IN_PROGRESS shows error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue({ code: statusCodes.IN_PROGRESS });
      const { getByText, findByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('Ya hay un inicio de sesion en curso');
    });

    test('Google sign-in unknown error shows error message', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(new Error('Unknown Google error'));
      const { getByText, findByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('Error al conectar con Google');
    });

    test('Google sign-in API network error shows server error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ idToken: 'token' });
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('timeout'));
      const { getByText, findByText } = render(<AdminLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText(/servidor/);
    });
  });
});