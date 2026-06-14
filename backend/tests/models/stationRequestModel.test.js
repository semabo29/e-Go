const stationRequestModel = require('../../models/stationRequestModel');
const stationModel = require('../../models/stationModel');
const { pool } = require('../../lib/db');

jest.mock('../../lib/db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
  STATION_REQUESTS_TABLE: '"ego"."station_requests"',
  EMPRESAS_TABLE: '"ego"."empresas"',
  USUARIOS_TABLE: '"ego"."usuari"',
}));

jest.mock('../../models/stationModel', () => ({
  createManualStation: jest.fn(),
  updateCompanyOwnedManualStation: jest.fn(),
  deleteCompanyOwnedManualStation: jest.fn(),
}));

describe('stationRequestModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createRequest inserta y devuelve la fila', async () => {
    const inserted = { id: 1, empresa_id: 10, action: 'create' };
    pool.query.mockResolvedValue({ rows: [inserted] });

    const row = await stationRequestModel.createRequest({
      empresaId: 10,
      stationId: null,
      action: 'create',
      payload: { nom: 'X' },
    });

    expect(row).toEqual(inserted);
    const [, params] = pool.query.mock.calls[0];
    expect(params[3]).toBe(JSON.stringify({ nom: 'X' }));
  });

  test('createRequest usa payload y stationId por defecto', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 2 }] });
    await stationRequestModel.createRequest({ empresaId: 7, action: 'delete' });
    const [, params] = pool.query.mock.calls[0];
    expect(params[1]).toBeNull();
    expect(params[3]).toBe('{}');
  });

  test('getPendingRequests devuelve filas', async () => {
    const rows = [{ id: 1, status: 'pending' }];
    pool.query.mockResolvedValue({ rows });
    await expect(stationRequestModel.getPendingRequests()).resolves.toEqual(rows);
  });

  test('getRequestsByCompany filtra por empresa', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await stationRequestModel.getRequestsByCompany(88);
    expect(pool.query.mock.calls[0][1]).toEqual([88]);
  });

  test('getRequestById devuelve fila o null', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 3 }] });
    await expect(stationRequestModel.getRequestById(3)).resolves.toEqual({ id: 3 });
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(stationRequestModel.getRequestById(99)).resolves.toBeNull();
  });

  test('rejectRequest devuelve fila actualizada o null', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'rejected' }] });
    await expect(
      stationRequestModel.rejectRequest({ requestId: 1, adminUserId: 2, rejectionReason: 'no' })
    ).resolves.toEqual({ id: 1, status: 'rejected' });
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      stationRequestModel.rejectRequest({ requestId: 9, adminUserId: 2 })
    ).resolves.toBeNull();
  });

  describe('approveRequest', () => {
    function mockClient(queries) {
      const client = {
        query: jest.fn(async (sql, params) => {
          const handler = queries.find((q) =>
            typeof q.match === 'string' ? sql.includes(q.match) : q.match.test(sql)
          );
          if (!handler) {
            return {};
          }
          return handler.result(sql, params);
        }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(client);
      return client;
    }

    test('devuelve null si la solicitud no existe', async () => {
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        { match: 'FOR UPDATE', result: () => ({ rows: [] }) },
        { match: 'ROLLBACK', result: () => ({}) },
      ]);

      const out = await stationRequestModel.approveRequest({ requestId: 1, adminUserId: 9 });
      expect(out).toBeNull();
    });

    test('lanza si la solicitud ya no esta pending', async () => {
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        {
          match: 'FOR UPDATE',
          result: () => ({
            rows: [{ id: 1, status: 'approved', action: 'create', empresa_id: 1, payload: {} }],
          }),
        },
        { match: 'ROLLBACK', result: () => ({}) },
      ]);

      await expect(
        stationRequestModel.approveRequest({ requestId: 1, adminUserId: 9 })
      ).rejects.toMatchObject({ code: 'REQUEST_ALREADY_RESOLVED' });
    });

    test('action create: crea estacion y aprueba', async () => {
      stationModel.createManualStation.mockResolvedValue({ id: 100, nom: 'Nueva' });
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        {
          match: 'FOR UPDATE',
          result: () => ({
            rows: [
              {
                id: 1,
                status: 'pending',
                action: 'create',
                empresa_id: 5,
                station_id: null,
                payload: { nom: 'Nueva', latitud: 1, longitud: 2 },
              },
            ],
          }),
        },
        {
          match: /^UPDATE.*station_requests/s,
          result: () => ({
            rows: [{ id: 1, status: 'approved' }],
          }),
        },
        { match: 'COMMIT', result: () => ({}) },
      ]);

      const out = await stationRequestModel.approveRequest({ requestId: 1, adminUserId: 9 });
      expect(stationModel.createManualStation).toHaveBeenCalled();
      expect(out.station.id).toBe(100);
      expect(out.request.status).toBe('approved');
    });

    test('action update: actualiza estacion de empresa', async () => {
      stationModel.updateCompanyOwnedManualStation.mockResolvedValue({ id: 20, nom: 'U' });
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        {
          match: 'FOR UPDATE',
          result: () => ({
            rows: [
              {
                id: 2,
                status: 'pending',
                action: 'update',
                empresa_id: 5,
                station_id: 20,
                payload: { nom: 'U' },
              },
            ],
          }),
        },
        {
          match: /^UPDATE.*station_requests/s,
          result: () => ({ rows: [{ id: 2, status: 'approved' }] }),
        },
        { match: 'COMMIT', result: () => ({}) },
      ]);

      const out = await stationRequestModel.approveRequest({ requestId: 2, adminUserId: 9 });
      expect(stationModel.updateCompanyOwnedManualStation).toHaveBeenCalledWith(
        20,
        5,
        { nom: 'U' },
        expect.anything()
      );
      expect(out.station.id).toBe(20);
    });

    test('action update: lanza si la estacion no existe', async () => {
      stationModel.updateCompanyOwnedManualStation.mockResolvedValue(null);
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        {
          match: 'FOR UPDATE',
          result: () => ({
            rows: [
              {
                id: 2,
                status: 'pending',
                action: 'update',
                empresa_id: 5,
                station_id: 20,
                payload: {},
              },
            ],
          }),
        },
        { match: 'ROLLBACK', result: () => ({}) },
      ]);

      await expect(stationRequestModel.approveRequest({ requestId: 2, adminUserId: 9 })).rejects.toMatchObject({
        code: 'STATION_NOT_FOUND',
      });
    });

    test('action delete: borra estacion de empresa', async () => {
      stationModel.deleteCompanyOwnedManualStation.mockResolvedValue({ id: 30 });
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        {
          match: 'FOR UPDATE',
          result: () => ({
            rows: [
              {
                id: 3,
                status: 'pending',
                action: 'delete',
                empresa_id: 5,
                station_id: 30,
                payload: {},
              },
            ],
          }),
        },
        {
          match: /^UPDATE.*station_requests/s,
          result: () => ({ rows: [{ id: 3, status: 'approved' }] }),
        },
        { match: 'COMMIT', result: () => ({}) },
      ]);

      const out = await stationRequestModel.approveRequest({ requestId: 3, adminUserId: 9 });
      expect(stationModel.deleteCompanyOwnedManualStation).toHaveBeenCalledWith(30, 5, expect.anything());
      expect(out.station.id).toBe(30);
    });

    test('action delete: lanza si la estacion no existe', async () => {
      stationModel.deleteCompanyOwnedManualStation.mockResolvedValue(null);
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        {
          match: 'FOR UPDATE',
          result: () => ({
            rows: [
              {
                id: 3,
                status: 'pending',
                action: 'delete',
                empresa_id: 5,
                station_id: 30,
                payload: {},
              },
            ],
          }),
        },
        { match: 'ROLLBACK', result: () => ({}) },
      ]);

      await expect(stationRequestModel.approveRequest({ requestId: 3, adminUserId: 9 })).rejects.toMatchObject({
        code: 'STATION_NOT_FOUND',
      });
    });

    test('action desconocida: lanza INVALID_ACTION', async () => {
      mockClient([
        { match: 'BEGIN', result: () => ({}) },
        {
          match: 'FOR UPDATE',
          result: () => ({
            rows: [
              {
                id: 4,
                status: 'pending',
                action: 'merge',
                empresa_id: 5,
                station_id: null,
                payload: {},
              },
            ],
          }),
        },
        { match: 'ROLLBACK', result: () => ({}) },
      ]);

      await expect(stationRequestModel.approveRequest({ requestId: 4, adminUserId: 9 })).rejects.toMatchObject({
        code: 'INVALID_ACTION',
      });
    });
  });
});
