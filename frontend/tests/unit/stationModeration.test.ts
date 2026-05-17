import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  listAdminStations,
  createAdminStation,
  updateAdminStation,
  deleteAdminStation,
  listCompanyStations,
  listCompanyRequests,
  requestCreateCompanyStation,
  requestUpdateCompanyStation,
  requestDeleteCompanyStation,
  listPendingRequests,
  approveRequest,
  rejectRequest,
} from '@/services/stationModeration';

jest.mock('@/services/privilegedAuth', () => ({
  privilegedFetch: jest.fn(),
}));

import { privilegedFetch } from '@/services/privilegedAuth';
const mockFetch = privilegedFetch as jest.MockedFunction<typeof privilegedFetch>;

function makeRes(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
}

const baseForm = {
  nom: 'Station A',
  latitud: '41.5',
  longitud: '2.1',
  kw: '22',
  tipus_connector: 'Type2',
  potencia: '',
  adreca: '',
  municipi: '',
  provincia: '',
  pais: '',
  operatiu: true,
};

describe('stationModeration', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('Admin station CRUD', () => {
    test('listAdminStations: fetches admin stations', async () => {
      const stations = [{ id: 1, nom: 'A' }];
      mockFetch.mockResolvedValueOnce(makeRes(stations));
      const result = await listAdminStations();
      expect(result).toEqual(stations);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/stations/mine');
    });

    test('createAdminStation: sends POST with converted payload', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const result = await createAdminStation(baseForm as any);
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/stations', expect.objectContaining({ method: 'POST' }));
      const init = mockFetch.mock.calls[0]?.[2] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body.latitud).toBe(41.5);
      expect(body.longitud).toBe(2.1);
      expect(body.kw).toBe(22);
    });

    test('createAdminStation: keeps falsy latitud/longitud/kw as-is', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);
      const form = { ...baseForm, latitud: '', longitud: '', kw: '' };
      await createAdminStation(form as any);
      const init = mockFetch.mock.calls[0]?.[2] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body.latitud).toBe('');
      expect(body.longitud).toBe('');
      expect(body.kw).toBe('');
    });

    test('updateAdminStation: sends PATCH filtering empty values', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const form = { ...baseForm, adreca: '', potencia: null };
      const result = await updateAdminStation(5, form as any);
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/stations/5', expect.objectContaining({ method: 'PATCH' }));
      const init = mockFetch.mock.calls[0]?.[2] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body.adreca).toBeUndefined();
      expect(body.potencia).toBeUndefined();
      expect(body.nom).toBe('Station A');
    });

    test('deleteAdminStation: sends DELETE request', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const result = await deleteAdminStation(3);
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/stations/3', { method: 'DELETE' });
    });
  });

  describe('Company station operations', () => {
    test('listCompanyStations: fetches company stations', async () => {
      const stations = [{ id: 10, nom: 'CompSt' }];
      mockFetch.mockResolvedValueOnce(makeRes(stations));
      const result = await listCompanyStations();
      expect(result).toEqual(stations);
      expect(mockFetch).toHaveBeenCalledWith('company', '/company/stations/mine');
    });

    test('listCompanyRequests: fetches company requests', async () => {
      const requests = [{ id: 20, status: 'pending' }];
      mockFetch.mockResolvedValueOnce(makeRes(requests));
      const result = await listCompanyRequests();
      expect(result).toEqual(requests);
      expect(mockFetch).toHaveBeenCalledWith('company', '/company/station-requests/mine');
    });

    test('requestCreateCompanyStation: sends POST to company endpoint', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const result = await requestCreateCompanyStation(baseForm as any);
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith('company', '/company/stations', expect.objectContaining({ method: 'POST' }));
    });

    test('requestUpdateCompanyStation: sends PATCH filtering empty values', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const form = { ...baseForm, adreca: '' };
      const result = await requestUpdateCompanyStation(7, form as any);
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith('company', '/company/stations/7', expect.objectContaining({ method: 'PATCH' }));
      const init = mockFetch.mock.calls[0]?.[2] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body.adreca).toBeUndefined();
    });

    test('requestDeleteCompanyStation: sends DELETE to company endpoint', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const result = await requestDeleteCompanyStation(8);
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith('company', '/company/stations/8', { method: 'DELETE' });
    });
  });

  describe('Admin request management', () => {
    test('listPendingRequests: fetches pending station requests', async () => {
      const requests = [{ id: 30, status: 'pending' }];
      mockFetch.mockResolvedValueOnce(makeRes(requests));
      const result = await listPendingRequests();
      expect(result).toEqual(requests);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/station-requests/pending');
    });

    test('approveRequest: sends POST to approve endpoint', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const result = await approveRequest(4);
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith('admin', '/admin/station-requests/4/approve', { method: 'POST' });
    });

    test('rejectRequest: sends POST with rejection reason', async () => {
      const mockRes = { ok: true } as Response;
      mockFetch.mockResolvedValueOnce(mockRes);
      const result = await rejectRequest(4, 'Incomplete data');
      expect(result).toBe(mockRes);
      expect(mockFetch).toHaveBeenCalledWith(
        'admin',
        '/admin/station-requests/4/reject',
        expect.objectContaining({ method: 'POST' })
      );
      const init = mockFetch.mock.calls[0]?.[2] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body.rejection_reason).toBe('Incomplete data');
    });
  });
});