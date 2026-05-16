import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSearchParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
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

import CompanyLoginScreen from '@/app/company-login';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

describe('CompanyLoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSearchParams).forEach((k) => delete mockSearchParams[k]);
    mockSavePrivilegedSession.mockResolvedValue(undefined);
    globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  test('renders title and email input', () => {
    const { getByText, getByPlaceholderText } = render(<CompanyLoginScreen />);
    expect(getByText('Acceso Empresa')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
  });

  test('shows error on empty email submit', async () => {
    const { getByText, findByText } = render(<CompanyLoginScreen />);
    fireEvent.press(getByText(/Iniciar/));
    await findByText(/obligatorios/);
  });

  test('local login success navigates to company-home', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        company: { id: 1, user_id: 10, email: 'empresa@test.com', username: 'empresa' },
        token: 'jwt-token',
      }),
    } as Response);

    const { getByPlaceholderText, getByText } = render(<CompanyLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'empresa@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass123');
    fireEvent.press(getByText(/Iniciar/));

    await waitFor(() => {
      expect(mockSavePrivilegedSession).toHaveBeenCalledWith(
        'company',
        expect.objectContaining({ token: 'jwt-token' })
      );
      expect(mockReplace).toHaveBeenCalledWith('/company-home');
    });
  });

  test('local login failure shows error detail', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Sin acceso', message: '' }),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<CompanyLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'bad@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'wrong');
    fireEvent.press(getByText(/Iniciar/));
    await findByText('Sin acceso');
  });

  test('local login failure with no error shows fallback', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<CompanyLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'bad@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'wrong');
    fireEvent.press(getByText(/Iniciar/));
    await findByText(/Error al iniciar/);
  });

  test('network error shows connection error', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Connection refused'));

    const { getByPlaceholderText, getByText, findByText } = render(<CompanyLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'empresa@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass');
    fireEvent.press(getByText(/Iniciar/));
    await findByText(/servidor/);
  });

  test('back link navigates to login', () => {
    const { getByText } = render(<CompanyLoginScreen />);
    fireEvent.press(getByText('Volver al login'));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  test('login without company in response does not navigate', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const { getByPlaceholderText, getByText } = render(<CompanyLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'empresa@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass');
    fireEvent.press(getByText(/Iniciar/));

    await waitFor(() => {
      expect(mockSavePrivilegedSession).not.toHaveBeenCalled();
    });
  });

  test('shows gestion subtitle', () => {
    const { getByText } = render(<CompanyLoginScreen />);
    expect(getByText(/Gestion/)).toBeTruthy();
  });

  test('shows success box with email after local login', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        company: { id: 1, user_id: 10, email: 'empresa@test.com', username: 'empresa' },
        token: 'jwt-token',
      }),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<CompanyLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'empresa@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass123');
    fireEvent.press(getByText(/Iniciar/));
    await findByText('Sesion iniciada');
    expect(getByText('empresa@test.com')).toBeTruthy();
  });

  test('Ir a la app button navigates to tabs', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        company: { id: 1, user_id: 10, email: 'empresa@test.com', username: 'empresa' },
        token: 'jwt-token',
      }),
    } as Response);

    const { getByPlaceholderText, getByText, findByText } = render(<CompanyLoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'empresa@test.com');
    fireEvent.changeText(getByPlaceholderText(/Contrase/), 'pass123');
    fireEvent.press(getByText(/Iniciar/));
    await findByText('Ir a la app');
    fireEvent.press(getByText('Ir a la app'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  describe('Google Native sign-in (handleLogin)', () => {
    test('successful Google sign-in calls API with idToken and navigates', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ data: { idToken: 'google-id-token' } });
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          company: { id: 2, user_id: 20, email: 'g@empresa.com', username: 'gempresa' },
          token: 'jwt-google',
        }),
      } as Response);

      const { getByText, findByText } = render(<CompanyLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('Sesion iniciada');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/company/google'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('Google sign-in with no idToken shows error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({});
      const { getByText, findByText } = render(<CompanyLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('No se pudo obtener el token de Google');
    });

    test('Google sign-in API failure shows error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ data: { idToken: 'token' } });
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Sin acceso empresa' }),
      } as Response);
      const { getByText, findByText } = render(<CompanyLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('Sin acceso empresa');
    });

    test('Google sign-in API network error shows server error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ data: { idToken: 'token' } });
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('network fail'));
      const { getByText, findByText } = render(<CompanyLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText(/servidor/);
    });

    test('Google sign-in cancelled - no error shown', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue({ code: statusCodes.SIGN_IN_CANCELLED });
      const { getByText, queryByText } = render(<CompanyLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await waitFor(() => expect(GoogleSignin.signIn).toHaveBeenCalled());
      expect(queryByText(/error/i)).toBeNull();
    });

    test('Google sign-in IN_PROGRESS shows error', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue({ code: statusCodes.IN_PROGRESS });
      const { getByText, findByText } = render(<CompanyLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('Ya hay un inicio de sesion en curso');
    });

    test('Google sign-in unknown error shows the error message', async () => {
      (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(new Error('Google crash'));
      const { getByText, findByText } = render(<CompanyLoginScreen />);
      fireEvent.press(getByText('Continuar con Google'));
      await findByText('Google crash');
    });
  });
});