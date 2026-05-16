import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { listAdminUsers, setUserBanStatus } from '@/services/adminUserModeration';

jest.mock('@/services/privilegedAuth', () => ({
  privilegedFetch: jest.fn(),
}));

import { privilegedFetch } from '@/services/privilegedAuth';
const mockFetch = privilegedFetch as jest.MockedFunction<typeof privilegedFetch>;

function makeRes(ok: boolean, data: unknown) {
  return { ok, json: async () => data } as unknown as Response;
}

describe('adminUserModeration', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listAdminUsers', () => {
    test('returns users array on success', async () => {
      const users = [{ id: 1, email: 'user@test.com', is_banned: false }];
      mockFetch.mockResolvedValueOnce(makeRes(true, { users }));
      const result = await listAdminUsers();
      expect(result).toEqual(users);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/users');
    });

    test('returns empty array if users field is missing', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(true, {}));
      const result = await listAdminUsers();
      expect(result).toEqual([]);
    });

    test('throws error message on not ok', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, { error: 'Forbidden' }));
      await expect(listAdminUsers()).rejects.toThrow('Forbidden');
    });

    test('throws default message if no error field', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, {}));
      await expect(listAdminUsers()).rejects.toThrow('No se pudo cargar la lista de usuarios');
    });
  });

  describe('setUserBanStatus', () => {
    test('bans user and returns updated user', async () => {
      const user = { id: 1, is_banned: true, banned_reason: 'Spam' };
      mockFetch.mockResolvedValueOnce(makeRes(true, { user }));
      const result = await setUserBanStatus(1, true, 'Spam');
      expect(result).toEqual(user);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/users/1/ban', expect.objectContaining({ method: 'PATCH' }));
    });

    test('unbans user without reason', async () => {
      const user = { id: 2, is_banned: false, banned_reason: null };
      mockFetch.mockResolvedValueOnce(makeRes(true, { user }));
      const result = await setUserBanStatus(2, false);
      expect(result).toEqual(user);
    });

    test('throws on not ok response', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, { error: 'Not found' }));
      await expect(setUserBanStatus(1, false)).rejects.toThrow('Not found');
    });

    test('throws if response ok but user field missing', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(true, {}));
      await expect(setUserBanStatus(1, false)).rejects.toThrow('No se pudo actualizar el estado del usuario');
    });

    test('throws default message if not ok and no error field', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, {}));
      await expect(setUserBanStatus(1, false)).rejects.toThrow('No se pudo actualizar el estado del usuario');
    });
  });
});