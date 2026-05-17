const incidenciaService = require('../../services/incidenciaService');
const adminIncidenciaController = require('../../controllers/adminIncidenciaController');

jest.mock('../../services/incidenciaService');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('adminIncidenciaController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── listPending ────────────────────────────────────────────────────────────

  describe('listPending', () => {
    test('200 con lista de incidencias pendientes', async () => {
      incidenciaService.adminListPending.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const req = {};
      const res = mockRes();

      await adminIncidenciaController.listPending(req, res);

      expect(res.json).toHaveBeenCalledWith({ incidencias: [{ id: 1 }, { id: 2 }] });
    });

    test('500 si el servicio falla', async () => {
      incidenciaService.adminListPending.mockRejectedValue(new Error('DB error'));
      const req = {};
      const res = mockRes();

      await adminIncidenciaController.listPending(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor' });
    });
  });

  // ─── listHistory ────────────────────────────────────────────────────────────

  describe('listHistory', () => {
    test('200 con todos los filtros', async () => {
      incidenciaService.adminListHistory.mockResolvedValue([{ id: 3 }]);
      const req = {
        query: { from: '2024-01-01', to: '2024-12-31', tipus: 'Operatiu', estado: 'pending', limit: '10', offset: '5' },
      };
      const res = mockRes();

      await adminIncidenciaController.listHistory(req, res);

      expect(incidenciaService.adminListHistory).toHaveBeenCalledWith({
        from: '2024-01-01',
        to: '2024-12-31',
        tipus: 'Operatiu',
        estado: 'pending',
        limit: 10,
        offset: 5,
      });
      expect(res.json).toHaveBeenCalledWith({ incidencias: [{ id: 3 }] });
    });

    test('200 sin filtros usa defaults', async () => {
      incidenciaService.adminListHistory.mockResolvedValue([]);
      const req = { query: {} };
      const res = mockRes();

      await adminIncidenciaController.listHistory(req, res);

      expect(incidenciaService.adminListHistory).toHaveBeenCalledWith({
        from: null, to: null, tipus: null, estado: null, limit: 20, offset: 0,
      });
    });

    test('limit se limita a 100 aunque llegue un valor mayor', async () => {
      incidenciaService.adminListHistory.mockResolvedValue([]);
      const req = { query: { limit: '999' } };
      const res = mockRes();

      await adminIncidenciaController.listHistory(req, res);

      expect(incidenciaService.adminListHistory).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    test('500 si el servicio falla', async () => {
      incidenciaService.adminListHistory.mockRejectedValue(new Error('DB error'));
      const req = { query: {} };
      const res = mockRes();

      await adminIncidenciaController.listHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor' });
    });
  });

  // ─── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    test('200 con la incidencia encontrada', async () => {
      incidenciaService.adminGetById.mockResolvedValue({ id: 5, tipus: 'Operatiu' });
      const req = { params: { id: '5' } };
      const res = mockRes();

      await adminIncidenciaController.getById(req, res);

      expect(incidenciaService.adminGetById).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith({ incidencia: { id: 5, tipus: 'Operatiu' } });
    });

    test('400 si el id no es un entero positivo (texto)', async () => {
      const req = { params: { id: 'abc' } };
      const res = mockRes();

      await adminIncidenciaController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });

    test('400 si el id es cero', async () => {
      const req = { params: { id: '0' } };
      const res = mockRes();

      await adminIncidenciaController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('400 si el id es negativo', async () => {
      const req = { params: { id: '-3' } };
      const res = mockRes();

      await adminIncidenciaController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('404 si el servicio lanza NOT_FOUND', async () => {
      incidenciaService.adminGetById.mockRejectedValue({ code: 'NOT_FOUND', message: 'No encontrada' });
      const req = { params: { id: '99' } };
      const res = mockRes();

      await adminIncidenciaController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No encontrada' });
    });

    test('500 en error no mapeado', async () => {
      incidenciaService.adminGetById.mockRejectedValue(new Error('DB error'));
      const req = { params: { id: '1' } };
      const res = mockRes();

      await adminIncidenciaController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor' });
    });
  });

  // ─── validate ───────────────────────────────────────────────────────────────

  describe('validate', () => {
    test('200 al validar correctamente', async () => {
      const serviceResult = { incidencia: { id: 1 }, pointsAwarded: { points: 10, isPremium: false } };
      incidenciaService.adminValidate.mockResolvedValue(serviceResult);
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.validate(req, res);

      expect(incidenciaService.adminValidate).toHaveBeenCalledWith(42, 1);
      expect(res.json).toHaveBeenCalledWith(serviceResult);
    });

    test('400 si el id es invalido', async () => {
      const req = { params: { id: '-1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.validate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('400 si el id es cero', async () => {
      const req = { params: { id: '0' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.validate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('409 en CONFLICT', async () => {
      incidenciaService.adminValidate.mockRejectedValue({ code: 'CONFLICT', message: 'Ya procesada' });
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.validate(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya procesada' });
    });

    test('404 en NOT_FOUND', async () => {
      incidenciaService.adminValidate.mockRejectedValue({ code: 'NOT_FOUND', message: 'No encontrada' });
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.validate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('500 en error no mapeado', async () => {
      incidenciaService.adminValidate.mockRejectedValue(new Error('DB error'));
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.validate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── reject ─────────────────────────────────────────────────────────────────

  describe('reject', () => {
    test('200 al rechazar con motivo', async () => {
      incidenciaService.adminReject.mockResolvedValue({ id: 1, rebutjada: true });
      const req = { params: { id: '1' }, admin: { sub: 42 }, body: { motiu: 'No es valido' } };
      const res = mockRes();

      await adminIncidenciaController.reject(req, res);

      expect(incidenciaService.adminReject).toHaveBeenCalledWith(42, 1, 'No es valido');
      expect(res.json).toHaveBeenCalledWith({ incidencia: { id: 1, rebutjada: true } });
    });

    test('200 al rechazar sin motiu (null)', async () => {
      incidenciaService.adminReject.mockResolvedValue({ id: 2, rebutjada: true });
      const req = { params: { id: '2' }, admin: { sub: 42 }, body: {} };
      const res = mockRes();

      await adminIncidenciaController.reject(req, res);

      expect(incidenciaService.adminReject).toHaveBeenCalledWith(42, 2, null);
    });

    test('400 si el id es invalido', async () => {
      const req = { params: { id: '0' }, admin: { sub: 42 }, body: {} };
      const res = mockRes();

      await adminIncidenciaController.reject(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('409 en CONFLICT', async () => {
      incidenciaService.adminReject.mockRejectedValue({ code: 'CONFLICT', message: 'Ya procesada' });
      const req = { params: { id: '1' }, admin: { sub: 42 }, body: {} };
      const res = mockRes();

      await adminIncidenciaController.reject(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya procesada' });
    });

    test('404 en NOT_FOUND', async () => {
      incidenciaService.adminReject.mockRejectedValue({ code: 'NOT_FOUND', message: 'No encontrada' });
      const req = { params: { id: '1' }, admin: { sub: 42 }, body: {} };
      const res = mockRes();

      await adminIncidenciaController.reject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('500 en error no mapeado', async () => {
      incidenciaService.adminReject.mockRejectedValue(new Error('boom'));
      const req = { params: { id: '1' }, admin: { sub: 42 }, body: {} };
      const res = mockRes();

      await adminIncidenciaController.reject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── resolve ────────────────────────────────────────────────────────────────

  describe('resolve', () => {
    test('200 al resolver', async () => {
      incidenciaService.adminResolve.mockResolvedValue({ id: 1, resolta: true });
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.resolve(req, res);

      expect(incidenciaService.adminResolve).toHaveBeenCalledWith(42, 1);
      expect(res.json).toHaveBeenCalledWith({ incidencia: { id: 1, resolta: true } });
    });

    test('400 si el id es texto', async () => {
      const req = { params: { id: 'abc' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.resolve(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('400 si el id es cero', async () => {
      const req = { params: { id: '0' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.resolve(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('409 en CONFLICT', async () => {
      incidenciaService.adminResolve.mockRejectedValue({ code: 'CONFLICT', message: 'No validada aun' });
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.resolve(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'No validada aun' });
    });

    test('404 en NOT_FOUND', async () => {
      incidenciaService.adminResolve.mockRejectedValue({ code: 'NOT_FOUND', message: 'No encontrada' });
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.resolve(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('500 en error no mapeado', async () => {
      incidenciaService.adminResolve.mockRejectedValue(new Error('boom'));
      const req = { params: { id: '1' }, admin: { sub: 42 } };
      const res = mockRes();

      await adminIncidenciaController.resolve(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});