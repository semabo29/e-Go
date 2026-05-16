import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  listPendingIncidencias,
  listHistoryIncidencias,
  validateIncidencia,
  rejectIncidencia,
  resolveIncidencia,
} from '@/services/incidenciaAdminService';

jest.mock('@/services/privilegedAuth', () => ({
  privilegedFetch: jest.fn(),
}));

import { privilegedFetch } from '@/services/privilegedAuth';
const mockFetch = privilegedFetch as jest.MockedFunction<typeof privilegedFetch>;

function makeRes(ok: boolean, data: unknown) {
  return { ok, json: async () => data } as unknown as Response;
}

describe('incidenciaAdminService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listPendingIncidencias', () => {
    test('returns incidencias array on success', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(true, { incidencias: [{ id: 1 }] }));
      const result = await listPendingIncidencias();
      expect(result).toEqual([{ id: 1 }]);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/incidencias/pending');
    });

    test('throws error message on not ok', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, { error: 'Forbidden' }));
      await expect(listPendingIncidencias()).rejects.toThrow('Forbidden');
    });

    test('throws default message if no error field', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, {}));
      await expect(listPendingIncidencias()).rejects.toThrow('Error cargando incidencias pendientes');
    });
  });

  describe('listHistoryIncidencias', () => {
    test('builds query string with all params', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(true, { incidencias: [{ id: 2 }] }));
      const result = await listHistoryIncidencias({
        from: '2024-01-01', to: '2024-12-31', tipus: 'Operatiu', estado: 'pending', limit: 10, offset: 5,
      });
      expect(result).toEqual([{ id: 2 }]);
      const calledPath = mockFetch.mock.calls[0]?.[1] as string;
      expect(calledPath).toContain('from=2024-01-01');
      expect(calledPath).toContain('to=2024-12-31');
      expect(calledPath).toContain('tipus=Operatiu');
      expect(calledPath).toContain('estado=pending');
      expect(calledPath).toContain('limit=10');
      expect(calledPath).toContain('offset=5');
    });

    test('no query string when all params omitted', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(true, { incidencias: [] }));
      await listHistoryIncidencias({});
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/incidencias/history');
    });

    test('throws on not ok response', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, { error: 'Server error' }));
      await expect(listHistoryIncidencias({})).rejects.toThrow('Server error');
    });

    test('throws default message if no error field', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, {}));
      await expect(listHistoryIncidencias({})).rejects.toThrow('Error cargando');
    });
  });

  describe('validateIncidencia', () => {
    test('returns data on success', async () => {
      const data = { incidencia: { id: 1 }, pointsAwarded: { points: 10, isPremium: false } };
      mockFetch.mockResolvedValueOnce(makeRes(true, data));
      const result = await validateIncidencia(1);
      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/incidencias/1/validate', { method: 'POST' });
    });

    test('throws on not ok response', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, { error: 'Conflict' }));
      await expect(validateIncidencia(1)).rejects.toThrow('Conflict');
    });

    test('throws default message if no error field', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, {}));
      await expect(validateIncidencia(1)).rejects.toThrow('Error validando incidencia');
    });
  });

  describe('rejectIncidencia', () => {
    test('returns incidencia on success with motiu', async () => {
      const inc = { id: 1, rebutjada: true };
      mockFetch.mockResolvedValueOnce(makeRes(true, { incidencia: inc }));
      const result = await rejectIncidencia(1, 'Bad report');
      expect(result).toEqual(inc);
      expect(mockFetch).toHaveBeenCalledWith(
        'admin',
        '/admin/incidencias/1/reject',
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('sends null motiu when no motiu provided', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(true, { incidencia: { id: 1 } }));
      await rejectIncidencia(1);
      const init = mockFetch.mock.calls[0]?.[2] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body.motiu).toBeNull();
    });

    test('throws on not ok response', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, { error: 'Not found' }));
      await expect(rejectIncidencia(1)).rejects.toThrow('Not found');
    });

    test('throws default message if no error field', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, {}));
      await expect(rejectIncidencia(1)).rejects.toThrow('Error rechazando incidencia');
    });
  });

  describe('resolveIncidencia', () => {
    test('returns incidencia on success', async () => {
      const inc = { id: 1, resolta: true };
      mockFetch.mockResolvedValueOnce(makeRes(true, { incidencia: inc }));
      const result = await resolveIncidencia(1);
      expect(result).toEqual(inc);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/incidencias/1/resolve', { method: 'POST' });
    });

    test('throws on not ok response', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, { error: 'Conflict' }));
      await expect(resolveIncidencia(1)).rejects.toThrow('Conflict');
    });

    test('throws default message if no error field', async () => {
      mockFetch.mockResolvedValueOnce(makeRes(false, {}));
      await expect(resolveIncidencia(1)).rejects.toThrow('Error resolviendo incidencia');
    });
  });
});