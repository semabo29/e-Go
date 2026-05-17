import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { fetchCompanyProfile, updateCompanyNombreOnServer, mergeStoredCompanyUser } from '@/services/companyProfile';

jest.mock('@/services/privilegedAuth', () => ({
  privilegedFetch: jest.fn(),
  getPrivilegedToken: jest.fn(),
  getPrivilegedUser: jest.fn(),
  savePrivilegedSession: jest.fn(),
}));

import { privilegedFetch, getPrivilegedToken, getPrivilegedUser, savePrivilegedSession } from '@/services/privilegedAuth';
const mockFetch = privilegedFetch as jest.MockedFunction<typeof privilegedFetch>;
const mockGetToken = getPrivilegedToken as jest.MockedFunction<typeof getPrivilegedToken>;
const mockGetUser = getPrivilegedUser as jest.MockedFunction<typeof getPrivilegedUser>;
const mockSaveSession = savePrivilegedSession as jest.MockedFunction<typeof savePrivilegedSession>;

function makeRes(status: number, ok: boolean, data: unknown) {
  return { status, ok, json: async () => data } as unknown as Response;
}

describe('companyProfile', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('fetchCompanyProfile', () => {
    test('returns company on success', async () => {
      const company = { id: 1, nombre: 'MyCo', email: 'co@test.com' };
      mockFetch.mockResolvedValueOnce(makeRes(200, true, { company }));
      const result = await fetchCompanyProfile();
      expect(result).toEqual(company);
      expect(mockFetch).toHaveBeenCalledWith('company', '/company/user');
    });

    test('throws NO_SESSION on 401', async () => {
      mockFetch.mockResolvedValueOnce({ status: 401 } as Response);
      await expect(fetchCompanyProfile()).rejects.toThrow('NO_SESSION');
    });

    test('throws error string on not ok (non-401)', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(500, false, { error: 'Server down' }));
      await expect(fetchCompanyProfile()).rejects.toThrow('Server down');
    });

    test('throws default message if error is not a string', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(500, false, { error: { detail: 'nested' } }));
      await expect(fetchCompanyProfile()).rejects.toThrow('Error al cargar empresa');
    });
  });

  describe('updateCompanyNombreOnServer', () => {
    test('returns updated company on success', async () => {
      const company = { id: 1, nombre: 'NewName' };
      mockFetch.mockResolvedValueOnce(makeRes(200, true, { company }));
      const result = await updateCompanyNombreOnServer('NewName');
      expect(result).toEqual(company);
      expect(mockFetch).toHaveBeenCalledWith(
        'company',
        '/company/profile',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    test('throws NO_SESSION on 401', async () => {
      mockFetch.mockResolvedValueOnce({ status: 401 } as Response);
      await expect(updateCompanyNombreOnServer('Test')).rejects.toThrow('NO_SESSION');
    });

    test('throws error string on not ok', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(400, false, { error: 'Invalid name' }));
      await expect(updateCompanyNombreOnServer('')).rejects.toThrow('Invalid name');
    });

    test('throws default message if error not a string', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(500, false, { error: 123 }));
      await expect(updateCompanyNombreOnServer('x')).rejects.toThrow('No se pudo guardar');
    });
  });

  describe('mergeStoredCompanyUser', () => {
    test('saves merged session when token and prev user exist', async () => {
      const prev = { id: 1, nombre: 'OldName', email: 'a@b.com', user_id: 5, created_at: '' };
      mockGetToken.mockResolvedValueOnce('tok123');
      mockGetUser.mockResolvedValueOnce(prev as any);
      mockSaveSession.mockResolvedValueOnce(undefined);

      await mergeStoredCompanyUser({ nombre: 'NewName' });

      expect(mockSaveSession).toHaveBeenCalledWith('company', {
        token: 'tok123',
        user: { ...prev, nombre: 'NewName' },
      });
    });

    test('does nothing if no token stored', async () => {
      mockGetToken.mockResolvedValueOnce(null);
      await mergeStoredCompanyUser({ nombre: 'NewName' });
      expect(mockSaveSession).not.toHaveBeenCalled();
    });

    test('does nothing if no prev user stored', async () => {
      mockGetToken.mockResolvedValueOnce('tok123');
      mockGetUser.mockResolvedValueOnce(null);
      await mergeStoredCompanyUser({ nombre: 'NewName' });
      expect(mockSaveSession).not.toHaveBeenCalled();
    });
  });
});