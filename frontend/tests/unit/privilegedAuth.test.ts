import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePrivilegedSession,
  clearPrivilegedSession,
  getPrivilegedToken,
  getPrivilegedUser,
  privilegedFetch,
  PRIVILEGED_STORAGE_KEYS,
} from '@/services/privilegedAuth';

jest.mock('@/constants/api', () => ({
  getApiUrl: jest.fn(() => 'http://test.api'),
}));

describe('privilegedAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  describe('savePrivilegedSession', () => {
    test('admin: stores token and user in AsyncStorage', async () => {
      const session = { token: 'tok123', user: { id: 1, email: 'admin@test.com' } };
      await savePrivilegedSession('admin', session);
      expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
        [PRIVILEGED_STORAGE_KEYS.adminToken, 'tok123'],
        [PRIVILEGED_STORAGE_KEYS.adminUser, JSON.stringify(session.user)],
      ]);
    });

    test('company: stores token and user with company keys', async () => {
      const session = { token: 'comp456', user: { id: 2, nombre: 'MyCompany' } };
      await savePrivilegedSession('company', session);
      expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
        [PRIVILEGED_STORAGE_KEYS.companyToken, 'comp456'],
        [PRIVILEGED_STORAGE_KEYS.companyUser, JSON.stringify(session.user)],
      ]);
    });
  });

  describe('clearPrivilegedSession', () => {
    test('admin: removes admin keys from AsyncStorage', async () => {
      await clearPrivilegedSession('admin');
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        PRIVILEGED_STORAGE_KEYS.adminToken,
        PRIVILEGED_STORAGE_KEYS.adminUser,
      ]);
    });

    test('company: removes company keys from AsyncStorage', async () => {
      await clearPrivilegedSession('company');
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        PRIVILEGED_STORAGE_KEYS.companyToken,
        PRIVILEGED_STORAGE_KEYS.companyUser,
      ]);
    });
  });

  describe('getPrivilegedToken', () => {
    test('admin: returns the stored admin token', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce('my-admin-token');
      const token = await getPrivilegedToken('admin');
      expect(token).toBe('my-admin-token');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(PRIVILEGED_STORAGE_KEYS.adminToken);
    });

    test('company: returns the stored company token', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce('my-company-token');
      const token = await getPrivilegedToken('company');
      expect(token).toBe('my-company-token');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(PRIVILEGED_STORAGE_KEYS.companyToken);
    });

    test('returns null if no token stored', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce(null);
      const token = await getPrivilegedToken('admin');
      expect(token).toBeNull();
    });
  });

  describe('getPrivilegedUser', () => {
    test('returns parsed user object', async () => {
      const user = { id: 1, email: 'admin@test.com' };
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce(JSON.stringify(user));
      const result = await getPrivilegedUser('admin');
      expect(result).toEqual(user);
    });

    test('returns null if no value stored', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce(null);
      const result = await getPrivilegedUser('admin');
      expect(result).toBeNull();
    });

    test('returns null if stored value is invalid JSON', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce('not-valid-json{');
      const result = await getPrivilegedUser('admin');
      expect(result).toBeNull();
    });
  });

  describe('privilegedFetch', () => {
    test('throws NO_SESSION if no token in storage', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce(null);
      await expect(privilegedFetch('admin', '/some/path')).rejects.toThrow('NO_SESSION');
    });

    test('calls fetch with Bearer token and correct URL', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce('tok-abc');
      (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true } as Response);

      await privilegedFetch('admin', '/admin/incidencias/pending');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://test.api/admin/incidencias/pending',
        expect.objectContaining({ headers: expect.any(Headers) })
      );
      const callArgs = (globalThis.fetch as jest.Mock<any>).mock.calls[0] as [string, RequestInit & { headers: Headers }];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer tok-abc');
    });

    test('sets Content-Type when body is provided and no Content-Type set', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce('tok-abc');
      (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true } as Response);

      await privilegedFetch('admin', '/path', { method: 'POST', body: '{"key":"val"}' });

      const callArgs = (globalThis.fetch as jest.Mock<any>).mock.calls[0] as [string, RequestInit & { headers: Headers }];
      expect(callArgs[1].headers.get('Content-Type')).toBe('application/json');
    });

    test('does not override Content-Type if already set', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce('tok-abc');
      (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true } as Response);

      await privilegedFetch('admin', '/path', {
        method: 'POST',
        body: 'data',
        headers: { 'Content-Type': 'text/plain' },
      });

      const callArgs = (globalThis.fetch as jest.Mock<any>).mock.calls[0] as [string, RequestInit & { headers: Headers }];
      expect(callArgs[1].headers.get('Content-Type')).toBe('text/plain');
    });

    test('no Content-Type when no body', async () => {
      (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValueOnce('tok-abc');
      (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true } as Response);

      await privilegedFetch('admin', '/path');

      const callArgs = (globalThis.fetch as jest.Mock<any>).mock.calls[0] as [string, RequestInit & { headers: Headers }];
      expect(callArgs[1].headers.get('Content-Type')).toBeNull();
    });
  });
});