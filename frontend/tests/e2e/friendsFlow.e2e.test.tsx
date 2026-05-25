/**
 * E2E de flujo UI: perfil usuario → enviar solicitud de amistad.
 * Ejecutar: npm run test:e2e -- friendsFlow
 *
 * Usa mocks de infraestructura (fetch, auth, router) pero componentes reales
 * del perfil de usuario y funcionalidad de amigos.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import PerfilScreen from '@/app/user';
import { useAuth } from '@/contexts/AuthContext';

let mockLocalParams: Record<string, unknown> = {};
const mockRouter = {
  push: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockLocalParams,
  useFocusEffect: (cb: () => void) => cb(),
  Stack: { Screen: () => null },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('react-native-view-shot', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef(({ children }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      capture: jest.fn(() => Promise.resolve('mock-uri')),
    }));
    return <View ref={ref}>{children}</View>;
  });
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('E2E: flujo de solicitud de amistad', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = { userId: '45' };
    mockRouter.push.mockClear();
    mockRouter.setParams.mockClear();
    mockRouter.navigate.mockClear();
    mockRouter.back.mockClear();

    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@test.com', username: 'e2e', created_at: '', updated_at: '' },
      logout: jest.fn(),
      isLoading: false,
    });

    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/user?usuari_id=')) {
        // GET user profile
        return {
          ok: true,
          json: async () => ({
            id: 45,
            username: 'testuser',
            email: 'test@example.com',
            punts: 100,
            created_at: '2024-01-01',
            premium: false,
            admin: false,
            empresa: false,
            valoracio: 4.5,
            amics: 5,
            posicio: 10,
            skin: null,
            carrega: 30,
          }),
        } as Response;
      }
      if (href.includes('/friends?usuari_id=')) {
        // GET friends list - initially empty (no friendship yet)
        return { ok: true, json: async () => [] } as Response;
      }
      if (href.includes('/friends?usuari_id1=12&usuari_id2=45') && !href.includes('method')) {
        // POST send friend request
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      if (href.includes('/friends?usuari_id1=12&usuari_id2=45') && href.includes('DELETE')) {
        // DELETE remove friend/cancel request
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      if (href.includes('/friends?usuari_id1=12&usuari_id2=45') && href.includes('PUT')) {
        // PUT accept friend request
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('enviar solicitud de amistad a otro usuario', async () => {
    // —— Paso 0: montar la pantalla de perfil de otro usuario ——
    const { getByTestId } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByTestId('send-friend-request-button')).toBeTruthy();
    });

    // —— Paso 1: pulsar botón enviar solicitud de amistad ——
    fireEvent.press(getByTestId('send-friend-request-button'));

    // —— Paso 2: verificar que se llamó a la API para enviar solicitud ——
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=12&usuari_id2=45'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  test('eliminar amigo existente', async () => {
    // Mock: ya son amigos
    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/user?usuari_id=')) {
        return {
          ok: true,
          json: async () => ({
            id: 45,
            username: 'testuser',
            email: 'test@example.com',
            punts: 100,
            created_at: '2024-01-01',
            premium: false,
            admin: false,
            empresa: false,
            valoracio: 4.5,
            amics: 5,
            posicio: 10,
            skin: null,
            carrega: 30,
          }),
        } as Response;
      }
      if (href.includes('/friends?usuari_id=')) {
        // GET friends list - already friends
        return {
          ok: true,
          json: async () => [
            {
              id: 12,
              username: 'e2e',
              per_acceptar: null, // null means accepted friendship
            },
          ],
        } as Response;
      }
      if (href.includes('/friends?usuari_id1=12&usuari_id2=45') && href.includes('DELETE')) {
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;

    const { getByTestId } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByTestId('remove-friend-button')).toBeTruthy();
    });

    // —— Paso 1: pulsar botón eliminar amigo ——
    fireEvent.press(getByTestId('remove-friend-button'));

    // —— Paso 2: verificar que se llamó a la API para eliminar amigo ——
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=12&usuari_id2=45'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  test('cancelar solicitud de amistad enviada', async () => {
    // Mock: solicitud enviada pendiente
    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/user?usuari_id=')) {
        return {
          ok: true,
          json: async () => ({
            id: 45,
            username: 'testuser',
            email: 'test@example.com',
            punts: 100,
            created_at: '2024-01-01',
            premium: false,
            admin: false,
            empresa: false,
            valoracio: 4.5,
            amics: 5,
            posicio: 10,
            skin: null,
            carrega: 30,
          }),
        } as Response;
      }
      if (href.includes('/friends?usuari_id=')) {
        // GET friends list - request sent
        return {
          ok: true,
          json: async () => [
            {
              id: 12,
              username: 'e2e',
              per_acceptar: 45, // 45 means pending acceptance by user 45
            },
          ],
        } as Response;
      }
      if (href.includes('/friends?usuari_id1=12&usuari_id2=45') && href.includes('DELETE')) {
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;

    const { getByTestId } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByTestId('cancel-friend-request-button')).toBeTruthy();
    });

    // —— Paso 1: pulsar botón cancelar solicitud ——
    fireEvent.press(getByTestId('cancel-friend-request-button'));

    // —— Paso 2: verificar que se llamó a la API para cancelar solicitud ——
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=12&usuari_id2=45'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  test('aceptar solicitud de amistad recibida', async () => {
    // Mock: solicitud recibida pendiente
    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/user?usuari_id=')) {
        return {
          ok: true,
          json: async () => ({
            id: 45,
            username: 'testuser',
            email: 'test@example.com',
            punts: 100,
            created_at: '2024-01-01',
            premium: false,
            admin: false,
            empresa: false,
            valoracio: 4.5,
            amics: 5,
            posicio: 10,
            skin: null,
            carrega: 30,
          }),
        } as Response;
      }
      if (href.includes('/friends?usuari_id=')) {
        // GET friends list - request received
        return {
          ok: true,
          json: async () => [
            {
              id: 12,
              username: 'e2e',
              per_acceptar: 12, // 12 means pending acceptance by logged user
            },
          ],
        } as Response;
      }
      if (href.includes('/friends?usuari_id1=12&usuari_id2=45') && href.includes('PUT')) {
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;

    const { getByTestId } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByTestId('accept-friend-request-button')).toBeTruthy();
    });

    // —— Paso 1: pulsar botón aceptar solicitud ——
    fireEvent.press(getByTestId('accept-friend-request-button'));

    // —— Paso 2: verificar que se llamó a la API para aceptar solicitud ——
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=12&usuari_id2=45'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  test('rechazar solicitud de amistad recibida', async () => {
    // Mock: solicitud recibida pendiente
    globalThis.fetch = jest.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/user?usuari_id=')) {
        return {
          ok: true,
          json: async () => ({
            id: 45,
            username: 'testuser',
            email: 'test@example.com',
            punts: 100,
            created_at: '2024-01-01',
            premium: false,
            admin: false,
            empresa: false,
            valoracio: 4.5,
            amics: 5,
            posicio: 10,
            skin: null,
            carrega: 30,
          }),
        } as Response;
      }
      if (href.includes('/friends?usuari_id=')) {
        // GET friends list - request received
        return {
          ok: true,
          json: async () => [
            {
              id: 12,
              username: 'e2e',
              per_acceptar: 12, // 12 means pending acceptance by logged user
            },
          ],
        } as Response;
      }
      if (href.includes('/friends?usuari_id1=12&usuari_id2=45') && href.includes('DELETE')) {
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${href}`);
    }) as unknown as typeof fetch;

    const { getByTestId } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByTestId('reject-friend-request-button')).toBeTruthy();
    });

    // —— Paso 1: pulsar botón rechazar solicitud ——
    fireEvent.press(getByTestId('reject-friend-request-button'));

    // —— Paso 2: verificar que se llamó a la API para rechazar solicitud ——
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=12&usuari_id2=45'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
