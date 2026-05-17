import React from 'react';
import { Alert, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AuthProvider, useAuth, type User } from '@/contexts/AuthContext';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('@/services/bannedUserSession', () => ({
  setBannedUserSessionHandler: jest.fn(),
  releaseBannedAlertLock: jest.fn(),
}));

const { releaseBannedAlertLock, setBannedUserSessionHandler } = jest.requireMock(
  '@/services/bannedUserSession'
) as {
  setBannedUserSessionHandler: jest.Mock;
  releaseBannedAlertLock: jest.Mock;
};

function AuthProbe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useAuth>) => void;
}) {
  const api = useAuth();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return <Text testID="auth-probe">{api.user?.email ?? 'none'}</Text>;
}

const baseUser: User = {
  id: 10,
  email: 'user@test.com',
  username: 'tester',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  token: 'tok',
};

describe('AuthContext', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    setBannedUserSessionHandler(null);
  });

  test('useAuth lanza fuera de AuthProvider', () => {
    function Outside() {
      useAuth();
      return null;
    }
    expect(() => render(<Outside />)).toThrow('useAuth debe usarse dentro de AuthProvider');
  });

  test('carga usuario guardado al montar', async () => {
    await AsyncStorage.setItem('@ego_user', JSON.stringify(baseUser));

    const { getByTestId } = render(
      <AuthProvider>
        <AuthProbe onReady={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('auth-probe').props.children).toBe('user@test.com');
    });
  });

  test('setUser persiste usuario normalizado', async () => {
    let api: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthProbe
          onReady={(value) => {
            api = value;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(api?.isLoading).toBe(false));

    await act(async () => {
      api!.setUser(baseUser);
    });

    const stored = await AsyncStorage.getItem('@ego_user');
    expect(JSON.parse(stored!)).toMatchObject({ email: 'user@test.com' });
  });

  test('setUser normaliza guest legacy y reescribe storage', async () => {
    const legacyGuest: User = {
      id: -1,
      email: 'emulator@local.dev',
      username: 'Guest',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    await AsyncStorage.setItem('@ego_user', JSON.stringify(legacyGuest));

    const { getByTestId } = render(
      <AuthProvider>
        <AuthProbe onReady={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('auth-probe').props.children).toBe('guest@ego.app');
    });

    const stored = JSON.parse((await AsyncStorage.getItem('@ego_user'))!) as User;
    expect(stored.id).toBe(2);
    expect(stored.email).toBe('guest@ego.app');
  });

  test('setUser(null) elimina storage', async () => {
    let api: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthProbe
          onReady={(value) => {
            api = value;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(api?.isLoading).toBe(false));

    await act(async () => {
      api!.setUser(baseUser);
    });
    await act(async () => {
      api!.setUser(null);
    });

    expect(api!.user).toBeNull();
    expect(await AsyncStorage.getItem('@ego_user')).toBeNull();
  });

  test('logout elimina usuario y storage', async () => {
    let api: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthProbe
          onReady={(value) => {
            api = value;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(api?.isLoading).toBe(false));

    await act(async () => {
      api!.setUser(baseUser);
    });
    await act(async () => {
      api!.logout();
    });

    expect(api!.user).toBeNull();
    expect(await AsyncStorage.getItem('@ego_user')).toBeNull();
  });

  test('handler de usuario baneado sin motivo usa texto por defecto', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let api: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthProbe
          onReady={(value) => {
            api = value;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(api?.isLoading).toBe(false));

    const bannedHandler = setBannedUserSessionHandler.mock.calls
      .map((call) => call[0])
      .find((handler): handler is (payload: { banned_reason: string | null }) => void =>
        typeof handler === 'function'
      );

    await act(async () => {
      bannedHandler!({ banned_reason: '   ' });
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Cuenta suspendida',
      expect.stringContaining('No se indicó un motivo'),
      expect.any(Array),
      { cancelable: false }
    );

    alertSpy.mockRestore();
  });

  test('handler de usuario baneado muestra alerta y hace logout', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let api: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthProbe
          onReady={(value) => {
            api = value;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(api?.isLoading).toBe(false));

    await act(async () => {
      api!.setUser(baseUser);
    });

    await waitFor(() => expect(setBannedUserSessionHandler).toHaveBeenCalled());
    const bannedHandler = setBannedUserSessionHandler.mock.calls
      .map((call) => call[0])
      .find((handler): handler is (payload: { banned_reason: string | null }) => void =>
        typeof handler === 'function'
      );
    expect(bannedHandler).toBeDefined();

    await act(async () => {
      bannedHandler!({ banned_reason: '  spam  ' });
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Cuenta suspendida',
      expect.stringContaining('spam'),
      expect.any(Array),
      { cancelable: false }
    );

    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress: () => void }>;
    await act(async () => {
      buttons[0].onPress();
    });

    expect(releaseBannedAlertLock).toHaveBeenCalled();
    expect(api!.user).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');

    alertSpy.mockRestore();
  });
});
