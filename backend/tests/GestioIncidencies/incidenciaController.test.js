const incidenciaService = require('../../services/incidenciaService');
const incidenciaController = require('../../controllers/incidenciaController');

// Mock del servicio para comprobar únicamente la capa controller:
// cómo transforma resultados/errores en respuestas HTTP.
jest.mock('../../services/incidenciaService');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('incidenciaController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTypes', () => {
    test('responde 200 con el array de tipos', async () => {
      // OK
      incidenciaService.listIncidenciaTypes.mockResolvedValue(['Avariat', 'Operatiu']);
      const req = {};
      const res = mockRes();

      await incidenciaController.getTypes(req, res);

      expect(res.json).toHaveBeenCalledWith(['Avariat', 'Operatiu']);
    });

    test('responde 500 si el servicio falla', async () => {
      // Si hay error del servidor, controller devuelve error genérico.
      incidenciaService.listIncidenciaTypes.mockRejectedValue(new Error('boom'));
      const req = {};
      const res = mockRes();

      await incidenciaController.getTypes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error obteniendo tipos de incidencia' });
    });
  });

  describe('create', () => {
    test('responde 201 cuando se crea la incidencia', async () => {
      // OK
      const req = {
        body: { comentari: 'texto', tipus: 'Operatiu', conductor: 18, estacio: 1 },
        file: undefined,
      };
      const res = mockRes();
      incidenciaService.createIncidencia.mockResolvedValue({ id: 1, tipus: 'Operatiu' });

      await incidenciaController.create(req, res);

      expect(incidenciaService.createIncidencia).toHaveBeenCalledWith(req.body, req.file);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1, tipus: 'Operatiu' });
    });

    test('responde 400 cuando el servicio lanza VALIDATION_ERROR', async () => {
      // Errores de validación de entrada.
      const req = { body: {}, file: undefined };
      const res = mockRes();
      incidenciaService.createIncidencia.mockRejectedValue({
        code: 'VALIDATION_ERROR',
        message: 'El comentario es obligatorio',
      });

      await incidenciaController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El comentario es obligatorio' });
    });

    test('responde 404 cuando el servicio lanza NOT_FOUND', async () => {
      // No existe la estación o el conductor en la base de datos.
      const req = { body: {}, file: undefined };
      const res = mockRes();
      incidenciaService.createIncidencia.mockRejectedValue({
        code: 'NOT_FOUND',
        message: 'La estación no existe',
      });

      await incidenciaController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'La estación no existe' });
    });

    test('responde 500 en error no mapeado', async () => {
      // Error del servidor.
      const req = { body: {}, file: undefined };
      const res = mockRes();
      incidenciaService.createIncidencia.mockRejectedValue(new Error('unexpected'));

      await incidenciaController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error creando incidencia' });
    });

    test('responde 201 en flujo incidencia solucionada', async () => {
      // el controller delega y devuelve 201.
      const req = {
        body: {
          comentari: 'La Incidencia está solucionada',
          tipus: 'Operatiu',
          conductor: 18,
          estacio: 2440207,
        },
        file: undefined,
      };
      const res = mockRes();
      incidenciaService.createIncidencia.mockResolvedValue({
        id: 77,
        ...req.body,
        arxiu: null,
      });

      await incidenciaController.create(req, res);

      expect(incidenciaService.createIncidencia).toHaveBeenCalledWith(req.body, undefined);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 77,
        tipus: 'Operatiu',
      }));
    });

    test('responde 400 si incidencia solucionada llega incompleta', async () => {
      // Errores de validación de entrada.
      const req = {
        body: {
          comentari: '',
          tipus: 'Operatiu',
          conductor: 18,
          estacio: 2440207,
        },
        file: undefined,
      };
      const res = mockRes();
      incidenciaService.createIncidencia.mockRejectedValue({
        code: 'VALIDATION_ERROR',
        message: 'El comentario es obligatorio',
      });

      await incidenciaController.create(req, res);

      expect(incidenciaService.createIncidencia).toHaveBeenCalledWith(req.body, undefined);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El comentario es obligatorio' });
    });
  });
});
