const incidenciaModel = require('../../models/incidenciaModel');
const userPointsModel = require('../../models/userPointsModel');
const subscriptionModel = require('../../models/subscriptionModel');
const { uploadFile, getPublicUrl } = require('../../lib/s3Service');
const incidenciaService = require('../../services/incidenciaService');

jest.mock('../../models/incidenciaModel', () => ({
  getIncidenciaTypes: jest.fn(),
  conductorExists: jest.fn(),
  stationExists: jest.fn(),
  createIncidencia: jest.fn(),
  countDistinctPendingReporters: jest.fn().mockResolvedValue(0),
  listPendingByStationAndType: jest.fn().mockResolvedValue([]),
  validateIncidencia: jest.fn(),
  rejectIncidencia: jest.fn(),
  resolveIncidencia: jest.fn(),
  setStationOperatiu: jest.fn(),
  listPending: jest.fn(),
  listHistory: jest.fn(),
  getById: jest.fn(),
}));

jest.mock('../../models/userPointsModel', () => ({
  addPoints: jest.fn(),
}));

jest.mock('../../models/subscriptionModel', () => ({
  findByUserId: jest.fn(),
}));

jest.mock('../../lib/s3Service', () => ({
  uploadFile: jest.fn(),
  getPublicUrl: jest.fn(),
}));

jest.mock('../../lib/db', () => ({
  pool: { connect: jest.fn() },
  CONDUCTORES_TABLE: 'ego.conductores',
}));

const mockClient = { query: jest.fn(), release: jest.fn() };

describe('incidenciaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { pool } = require('../../lib/db');
    pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({});
    userPointsModel.addPoints.mockResolvedValue();
    subscriptionModel.findByUserId.mockResolvedValue(null);
  });

  // ─── listIncidenciaTypes ────────────────────────────────────────────────────

  describe('listIncidenciaTypes', () => {
    test('devuelve los tipos obtenidos del modelo', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);

      const result = await incidenciaService.listIncidenciaTypes();

      expect(result).toEqual(['Operatiu', 'Altres']);
      expect(incidenciaModel.getIncidenciaTypes).toHaveBeenCalledTimes(1);
    });
  });

  // ─── createIncidencia ───────────────────────────────────────────────────────

  describe('createIncidencia', () => {
    const validData = {
      comentari: 'No funciona el conector',
      tipus: 'Operatiu',
      conductor: 18,
      estacio: 2440207,
    };

    test('falla si el comentario esta vacio', async () => {
      await expect(
        incidenciaService.createIncidencia({ ...validData, comentari: '   ' })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'El comentario es obligatorio' });
    });

    test('falla si el tipo esta vacio', async () => {
      await expect(
        incidenciaService.createIncidencia({ ...validData, tipus: '' })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'El tipo es obligatorio' });
    });

    test('falla si el conductor no es valido', async () => {
      await expect(
        incidenciaService.createIncidencia({ ...validData, conductor: 0 })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: expect.stringContaining('Conductor') });
    });

    test('falla si la estacion no es valida', async () => {
      await expect(
        incidenciaService.createIncidencia({ ...validData, estacio: -1 })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: expect.stringContaining('Estaci') });
    });

    test('falla si el tipo no existe en el enum', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Avariat', 'Altres']);

      await expect(
        incidenciaService.createIncidencia(validData)
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: expect.stringContaining('tipo seleccionado') });
    });

    test('falla si el conductor no existe', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(false);
      incidenciaModel.stationExists.mockResolvedValue(true);

      await expect(
        incidenciaService.createIncidencia(validData)
      ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'El conductor no existe' });
    });

    test('falla si la estacion no existe', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(true);
      incidenciaModel.stationExists.mockResolvedValue(false);

      await expect(
        incidenciaService.createIncidencia(validData)
      ).rejects.toMatchObject({ code: 'NOT_FOUND', message: expect.stringContaining('estaci') });
    });

    test('falla con mime no permitido', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(true);
      incidenciaModel.stationExists.mockResolvedValue(true);

      const file = { buffer: Buffer.from('pdf'), originalname: 'doc.pdf', mimetype: 'application/pdf' };

      await expect(
        incidenciaService.createIncidencia(validData, file)
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: expect.stringContaining('JPG') });
    });

    test('crea incidencia sin archivo cuando datos son validos', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(true);
      incidenciaModel.stationExists.mockResolvedValue(true);
      incidenciaModel.createIncidencia.mockResolvedValue({ id: 10, ...validData, arxiu: null });

      const result = await incidenciaService.createIncidencia(validData);

      expect(incidenciaModel.createIncidencia).toHaveBeenCalledWith(
        expect.objectContaining({
          tipus: 'Operatiu',
          comentari: 'No funciona el conector',
          conductor: 18,
          estacio: 2440207,
          arxiu: null,
        }),
        mockClient
      );
      expect(result).toEqual(expect.objectContaining({ id: 10 }));
    });

    test('crea incidencia con archivo cuando mime es valido', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(true);
      incidenciaModel.stationExists.mockResolvedValue(true);
      uploadFile.mockResolvedValue('uploads/abc.jpg');
      getPublicUrl.mockReturnValue('https://bucket.s3.eu-north-1.amazonaws.com/uploads/abc.jpg');
      incidenciaModel.createIncidencia.mockResolvedValue({ id: 11, ...validData });

      const file = { buffer: Buffer.from('img'), originalname: 'foto.jpg', mimetype: 'image/jpeg' };

      await incidenciaService.createIncidencia(validData, file);

      expect(uploadFile).toHaveBeenCalledWith(file.buffer, 'foto.jpg', 'image/jpeg');
      expect(getPublicUrl).toHaveBeenCalledWith('uploads/abc.jpg');
      expect(incidenciaModel.createIncidencia).toHaveBeenCalledWith(
        expect.objectContaining({ arxiu: 'https://bucket.s3.eu-north-1.amazonaws.com/uploads/abc.jpg' }),
        mockClient
      );
    });

    test('hace ROLLBACK si el modelo falla al crear', async () => {
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(true);
      incidenciaModel.stationExists.mockResolvedValue(true);
      incidenciaModel.createIncidencia.mockRejectedValue(new Error('DB error'));

      await expect(incidenciaService.createIncidencia(validData)).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    describe('auto-trigger al alcanzar umbral', () => {
      const setupValidCreate = () => {
        incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
        incidenciaModel.conductorExists.mockResolvedValue(true);
        incidenciaModel.stationExists.mockResolvedValue(true);
        incidenciaModel.createIncidencia.mockResolvedValue({ id: 1, ...validData });
      };

      test('valida en lote y otorga puntos cuando count >= 5 (Operatiu)', async () => {
        setupValidCreate();
        incidenciaModel.countDistinctPendingReporters.mockResolvedValue(5);
        incidenciaModel.listPendingByStationAndType.mockResolvedValue([
          { id: 10, conductor: 18 },
          { id: 11, conductor: 20 },
        ]);
        incidenciaModel.validateIncidencia.mockResolvedValue({ incidencia: { id: 10, conductor: 18 }, awardPoints: true });
        incidenciaModel.resolveIncidencia.mockResolvedValue({ id: 10 });

        await incidenciaService.createIncidencia(validData);

        expect(incidenciaModel.validateIncidencia).toHaveBeenCalledTimes(2);
        expect(userPointsModel.addPoints).toHaveBeenCalledTimes(2);
        expect(incidenciaModel.resolveIncidencia).toHaveBeenCalledTimes(2);
        expect(incidenciaModel.setStationOperatiu).toHaveBeenCalledWith(mockClient, 2440207, true);
      });

      test('no llama a resolveIncidencia si tipo no es Operatiu', async () => {
        const altresData = { ...validData, tipus: 'Altres' };
        incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
        incidenciaModel.conductorExists.mockResolvedValue(true);
        incidenciaModel.stationExists.mockResolvedValue(true);
        incidenciaModel.createIncidencia.mockResolvedValue({ id: 1, ...altresData });
        incidenciaModel.countDistinctPendingReporters.mockResolvedValue(5);
        incidenciaModel.listPendingByStationAndType.mockResolvedValue([{ id: 10, conductor: 18 }]);
        incidenciaModel.validateIncidencia.mockResolvedValue({ incidencia: { id: 10, conductor: 18 }, awardPoints: true });

        await incidenciaService.createIncidencia(altresData);

        expect(incidenciaModel.resolveIncidencia).not.toHaveBeenCalled();
        expect(incidenciaModel.setStationOperatiu).not.toHaveBeenCalled();
      });

      test('salta incidencia si validateIncidencia devuelve null', async () => {
        setupValidCreate();
        incidenciaModel.countDistinctPendingReporters.mockResolvedValue(5);
        incidenciaModel.listPendingByStationAndType.mockResolvedValue([{ id: 10, conductor: 18 }]);
        incidenciaModel.validateIncidencia.mockResolvedValue(null);

        await incidenciaService.createIncidencia(validData);

        expect(userPointsModel.addPoints).not.toHaveBeenCalled();
      });

      test('otorga puntos premium (x2) si conductor tiene suscripcion activa', async () => {
        setupValidCreate();
        incidenciaModel.countDistinctPendingReporters.mockResolvedValue(5);
        incidenciaModel.listPendingByStationAndType.mockResolvedValue([{ id: 10, conductor: 18 }]);
        incidenciaModel.validateIncidencia.mockResolvedValue({ incidencia: { id: 10, conductor: 18 }, awardPoints: true });
        incidenciaModel.resolveIncidencia.mockResolvedValue({ id: 10 });
        subscriptionModel.findByUserId.mockResolvedValue({ status: 'active' });

        await incidenciaService.createIncidencia(validData);

        expect(userPointsModel.addPoints).toHaveBeenCalledWith(18, 20);
      });
    });

    describe('flujo incidencia solucionada', () => {
      const solvedData = {
        comentari: 'La Incidencia esta solucionada',
        tipus: 'Operatiu',
        conductor: 18,
        estacio: 2440207,
      };

      test('crea incidencia solucionada sin archivo adjunto', async () => {
        incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
        incidenciaModel.conductorExists.mockResolvedValue(true);
        incidenciaModel.stationExists.mockResolvedValue(true);
        incidenciaModel.createIncidencia.mockResolvedValue({ id: 99, ...solvedData, arxiu: null });

        const result = await incidenciaService.createIncidencia(solvedData);

        expect(uploadFile).not.toHaveBeenCalled();
        expect(getPublicUrl).not.toHaveBeenCalled();
        expect(incidenciaModel.createIncidencia).toHaveBeenCalledWith(
          expect.objectContaining({
            comentari: 'La Incidencia esta solucionada',
            tipus: 'Operatiu',
            conductor: 18,
            estacio: 2440207,
            arxiu: null,
          }),
          mockClient
        );
        expect(result).toEqual(expect.objectContaining({ id: 99 }));
      });

      test('falla en incidencia solucionada si Operatiu no existe en enum', async () => {
        incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Avariat', 'Altres']);

        await expect(incidenciaService.createIncidencia(solvedData)).rejects.toMatchObject({
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('tipo seleccionado'),
        });

        expect(incidenciaModel.createIncidencia).not.toHaveBeenCalled();
      });

      test('no intenta subir archivo si incidencia solucionada no trae adjunto', async () => {
        incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
        incidenciaModel.conductorExists.mockResolvedValue(true);
        incidenciaModel.stationExists.mockResolvedValue(true);
        incidenciaModel.createIncidencia.mockResolvedValue({ id: 100, ...solvedData, arxiu: null });

        await incidenciaService.createIncidencia(solvedData);

        expect(uploadFile).not.toHaveBeenCalled();
        expect(getPublicUrl).not.toHaveBeenCalled();
        expect(incidenciaModel.createIncidencia).toHaveBeenCalledWith(
          expect.objectContaining({ tipus: 'Operatiu', comentari: 'La Incidencia esta solucionada', arxiu: null }),
          mockClient
        );
      });
    });
  });

  // ─── Admin service functions ────────────────────────────────────────────────

  describe('adminListPending', () => {
    test('delega al modelo y devuelve incidencias pendientes', async () => {
      incidenciaModel.listPending.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await incidenciaService.adminListPending();
      expect(incidenciaModel.listPending).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

  });

  describe('adminListHistory', () => {
    test('delega filtros al modelo', async () => {
      const filters = { from: '2024-01-01', to: null, tipus: 'Operatiu', estado: 'pending', limit: 10, offset: 0 };
      incidenciaModel.listHistory.mockResolvedValue([{ id: 3 }]);
      const result = await incidenciaService.adminListHistory(filters);
      expect(incidenciaModel.listHistory).toHaveBeenCalledWith(filters);
      expect(result).toEqual([{ id: 3 }]);
    });

    test('admite filtros vacios', async () => {
      const filters = { from: null, to: null, tipus: null, estado: null, limit: 20, offset: 0 };
      incidenciaModel.listHistory.mockResolvedValue([]);
      const result = await incidenciaService.adminListHistory(filters);
      expect(result).toEqual([]);
    });
  });

  describe('adminGetById', () => {
    test('devuelve la incidencia si existe', async () => {
      incidenciaModel.getById.mockResolvedValue({ id: 5, tipus: 'Operatiu' });
      const result = await incidenciaService.adminGetById(5);
      expect(result).toEqual({ id: 5, tipus: 'Operatiu' });
    });

    test('lanza NOT_FOUND si no existe', async () => {
      incidenciaModel.getById.mockResolvedValue(null);
      await expect(incidenciaService.adminGetById(99)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('no encontrada'),
      });
    });
  });

  describe('adminValidate', () => {
    test('valida y otorga puntos normales (no premium)', async () => {
      incidenciaModel.validateIncidencia.mockResolvedValue({
        incidencia: { id: 1, conductor: 18 },
        awardPoints: true,
      });

      const result = await incidenciaService.adminValidate(42, 1);

      expect(incidenciaModel.validateIncidencia).toHaveBeenCalledWith(mockClient, 1, 42);
      expect(userPointsModel.addPoints).toHaveBeenCalledWith(18, 10);
      expect(result).toMatchObject({ incidencia: { id: 1 }, pointsAwarded: { points: 10, isPremium: false } });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('valida y otorga puntos premium (x2) si suscripcion activa', async () => {
      incidenciaModel.validateIncidencia.mockResolvedValue({
        incidencia: { id: 2, conductor: 20 },
        awardPoints: true,
      });
      subscriptionModel.findByUserId.mockResolvedValue({ status: 'active' });

      const result = await incidenciaService.adminValidate(42, 2);

      expect(userPointsModel.addPoints).toHaveBeenCalledWith(20, 20);
      expect(result).toMatchObject({ pointsAwarded: { points: 20, isPremium: true } });
    });

    test('valida sin otorgar puntos si awardPoints es false', async () => {
      incidenciaModel.validateIncidencia.mockResolvedValue({
        incidencia: { id: 3, conductor: 18 },
        awardPoints: false,
      });

      const result = await incidenciaService.adminValidate(42, 3);

      expect(userPointsModel.addPoints).not.toHaveBeenCalled();
      expect(result.pointsAwarded).toBeNull();
    });

    test('lanza CONFLICT si ya esta procesada (validateIncidencia devuelve null)', async () => {
      incidenciaModel.validateIncidencia.mockResolvedValue(null);

      await expect(incidenciaService.adminValidate(42, 1)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('adminReject', () => {
    test('rechaza la incidencia con motivo', async () => {
      incidenciaModel.rejectIncidencia.mockResolvedValue({ id: 1, rebutjada: true });

      const result = await incidenciaService.adminReject(42, 1, 'El problema no existe');

      expect(incidenciaModel.rejectIncidencia).toHaveBeenCalledWith(mockClient, 1, 42, 'El problema no existe');
      expect(result).toEqual({ id: 1, rebutjada: true });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('rechaza sin motivo (null)', async () => {
      incidenciaModel.rejectIncidencia.mockResolvedValue({ id: 2, rebutjada: true });

      await incidenciaService.adminReject(42, 2, null);

      expect(incidenciaModel.rejectIncidencia).toHaveBeenCalledWith(mockClient, 2, 42, null);
    });

    test('lanza CONFLICT si ya procesada (rejectIncidencia devuelve null)', async () => {
      incidenciaModel.rejectIncidencia.mockResolvedValue(null);

      await expect(incidenciaService.adminReject(42, 1, null)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('adminResolve', () => {
    test('resuelve con tipo Operatiu y marca la estacion como operativa', async () => {
      incidenciaModel.resolveIncidencia.mockResolvedValue({ id: 1, tipus: 'Operatiu', estacio: 5 });

      const result = await incidenciaService.adminResolve(42, 1);

      expect(incidenciaModel.resolveIncidencia).toHaveBeenCalledWith(mockClient, 1, 42);
      expect(incidenciaModel.setStationOperatiu).toHaveBeenCalledWith(mockClient, 5, true);
      expect(result).toEqual({ id: 1, tipus: 'Operatiu', estacio: 5 });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('resuelve con tipo Altres sin marcar estacion', async () => {
      incidenciaModel.resolveIncidencia.mockResolvedValue({ id: 2, tipus: 'Altres', estacio: 5 });

      await incidenciaService.adminResolve(42, 2);

      expect(incidenciaModel.setStationOperatiu).not.toHaveBeenCalled();
    });

    test('lanza CONFLICT si no esta validada (resolveIncidencia devuelve null)', async () => {
      incidenciaModel.resolveIncidencia.mockResolvedValue(null);

      await expect(incidenciaService.adminResolve(42, 1)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});