import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import LoginScreen from '@/app/login';

const mockSetUser = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
/** Respuesta simulada de GoogleSignin.signIn (idToken plano o en data, u objeto vacío). */
type MockGoogleSignInUserInfo = {
  idToken?: string;
  data?: { idToken?: string };
};

const mockSignIn = jest.fn<(..._args: unknown[]) => Promise<MockGoogleSignInUserInfo>>();
const mockSearchParams: Record<string, string | undefined> = {};

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
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve()),
    signIn: (...args: unknown[]) => mockSignIn(...args),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
  },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MaterialIcons({ name }: { name: string }) {
    return React.createElement(Text, { testID: `material-icon-${name}` }, name);
  };
});

describe('LoginScreen integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSearchParams).forEach((k) => delete mockSearchParams[k]);
    mockSignIn.mockResolvedValue({ idToken: 'google-token' });
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
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
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
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

  test('Continuar sin Google asigna usuario invitado y navega a tabs', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar sin Google'));
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'guest@ego.app', username: 'Guest User' })
      );
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  test('Google nativo exitoso: setUser y navegación', async () => {
    const { getByText } = render(<LoginScreen />);
    mockSignIn.mockResolvedValueOnce({ data: { idToken: 'tok-from-data' } });
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/google')) {
        return {
          ok: true,
          json: async () => ({ user: { id: 2, email: 'g2@test.com', username: 'g2' } }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'g2@test.com' }));
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  test('Google sin idToken muestra error', async () => {
    mockSignIn.mockResolvedValueOnce({});
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText('No se pudo obtener el token de Google')).toBeTruthy();
    });
  });

  test('needsUsername: flujo elegir nombre y registro', async () => {
    mockSignIn.mockResolvedValueOnce({ idToken: 't' });
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/google')) {
        return {
          ok: true,
          json: async () => ({
            needsUsername: true,
            pending_token: 'pend.tok',
          }),
        } as Response;
      }
      if (url.includes('/auth/register')) {
        return {
          ok: true,
          json: async () => ({
            user: { id: 99, email: 'new@test.com', username: 'chosen' },
          }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText('Elige tu nombre de usuario')).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText('Nombre de usuario'), 'chosen');
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'chosen' }));
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  test('mode=register abre formulario de registro local', async () => {
    mockSearchParams.mode = 'register';
    const { getByText } = render(<LoginScreen />);
    await waitFor(() => {
      expect(getByText('Registro')).toBeTruthy();
      expect(getByText('Crear cuenta')).toBeTruthy();
    });
  });

  test('mode=login abre inicio de sesión local', async () => {
    mockSearchParams.mode = 'login';
    const { getByText } = render(<LoginScreen />);
    await waitFor(() => {
      expect(getByText('Iniciar sesión')).toBeTruthy();
    });
  });

  test('openGoogle=1 mantiene vista Google', async () => {
    mockSearchParams.openGoogle = '1';
    const { getAllByText } = render(<LoginScreen />);
    await waitFor(() => {
      expect(getAllByText('Continuar con Google').length).toBeGreaterThanOrEqual(1);
    });
  });

  test('login local muestra error si faltan email o contraseña', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.press(getByText('Iniciar sesión'));
    await waitFor(() => {
      expect(getByText('Email y contraseña son obligatorios')).toBeTruthy();
    });
  });

  test('registro local exitoso', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/local/register')) {
        return {
          ok: true,
          json: async () => ({
            user: { id: 50, email: 'reg@test.com', username: 'reguser' },
          }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.press(getByText('¿No tienes cuenta? Regístrate con mail'));
    fireEvent.changeText(getByPlaceholderText('Nombre de usuario'), 'reguser');
    fireEvent.changeText(getByPlaceholderText('Email'), 'reg@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'secret123');
    fireEvent.changeText(getByPlaceholderText('Confirmar contraseña'), 'secret123');
    fireEvent.press(getByText('Crear cuenta'));
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'reg@test.com' }));
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  test('Google cancelado limpia error', async () => {
    const { statusCodes } = require('@react-native-google-signin/google-signin');
    mockSignIn.mockImplementation(() => Promise.reject({ code: statusCodes.SIGN_IN_CANCELLED }));
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  test('Google IN_PROGRESS muestra mensaje', async () => {
    const { statusCodes } = require('@react-native-google-signin/google-signin');
    mockSignIn.mockImplementation(() => Promise.reject({ code: statusCodes.IN_PROGRESS }));
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText('Ya hay un inicio de sesión en curso')).toBeTruthy();
    });
  });

  test('Acceso Empresa y Acceso Admin llaman a push', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Acceso Empresa'));
    fireEvent.press(getByText('Acceso Admin'));
    expect(mockPush).toHaveBeenCalled();
  });

  test('fetch /auth/google con fallo de red tipo Network muestra mensaje en __DEV__', async () => {
    const prev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
      throw Object.assign(new Error('fail'), { message: 'Network request failed' });
    });
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText(/No llega al backend/)).toBeTruthy();
    });
    (globalThis as { __DEV__?: boolean }).__DEV__ = prev;
  });

  test('fetch /auth/google con otro error de red muestra mensaje genérico', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
      throw new Error('timeout');
    });
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText('No se pudo conectar con el servidor.')).toBeTruthy();
    });
  });

  test('Google responde no ok muestra error del backend', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/google')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Token inválido' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText('Token inválido')).toBeTruthy();
    });
  });

  test('registerWithUsername muestra error si el servidor responde sin user', async () => {
    mockSignIn.mockResolvedValueOnce({ idToken: 't' });
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/google')) {
        return {
          ok: true,
          json: async () => ({ needsUsername: true, pending_token: 'p.tok' }),
        } as Response;
      }
      if (url.includes('/auth/register')) {
        return { ok: true, status: 200, json: async () => ({ error: 'Nombre ocupado' }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => expect(getByText('Elige tu nombre de usuario')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('Nombre de usuario'), 'u1');
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(getByText('Nombre ocupado')).toBeTruthy());
  });

  test('registerWithUsername catch de red', async () => {
    mockSignIn.mockResolvedValueOnce({ idToken: 't' });
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/google')) {
        return {
          ok: true,
          json: async () => ({ needsUsername: true, pending_token: 'p2' }),
        } as Response;
      }
      if (url.includes('/auth/register')) {
        throw new Error('network');
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => expect(getByText('Elige tu nombre de usuario')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('Nombre de usuario'), 'u2');
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(getByText('No se pudo conectar con el servidor.')).toBeTruthy());
  });

  test('login local responde no ok', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/local/login')) {
        return { ok: false, status: 401, json: async () => ({ error: 'Credenciales incorrectas' }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@a.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'pw');
    fireEvent.press(getByText('Iniciar sesión'));
    await waitFor(() => expect(getByText('Credenciales incorrectas')).toBeTruthy());
  });

  test('login local catch de red', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes('/auth/local/login')) throw new Error('down');
      return { ok: false, json: async () => ({}) } as Response;
    });
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@a.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'pw');
    fireEvent.press(getByText('Iniciar sesión'));
    await waitFor(() => expect(getByText('No se pudo conectar con el servidor.')).toBeTruthy());
  });

  test('desde mail se puede volver a vista Google', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText('Continuar sin Google')).toBeTruthy();
    });
  });

  test('Google error genérico (sin code)', async () => {
    mockSignIn.mockImplementation(() => Promise.reject(new Error('Play services')));
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => {
      expect(getByText('Error al conectar con Google')).toBeTruthy();
    });
  });

  test('contraseña oculta por defecto (puntos) y ojo alterna visibilidad', () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
    fireEvent.press(getByText('Mail y contraseña'));
    const pwd = getByPlaceholderText('Contraseña');
    expect(pwd.props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Mostrar contraseña'));
    expect(getByPlaceholderText('Contraseña').props.secureTextEntry).toBe(false);
    fireEvent.press(getByLabelText('Ocultar contraseña'));
    expect(getByPlaceholderText('Contraseña').props.secureTextEntry).toBe(true);
  });

  test('confirmar contraseña tiene ojo independiente', () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(<LoginScreen />);
    fireEvent.press(getByText('Mail y contraseña'));
    fireEvent.press(getByText('¿No tienes cuenta? Regístrate con mail'));
    expect(getByPlaceholderText('Confirmar contraseña').props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Mostrar confirmación'));
    expect(getByPlaceholderText('Confirmar contraseña').props.secureTextEntry).toBe(false);
  });
});
