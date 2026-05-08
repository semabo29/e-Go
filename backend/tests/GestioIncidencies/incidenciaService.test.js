const incidenciaModel = require('../../models/incidenciaModel');
const { uploadFile, getPublicUrl } = require('../../lib/s3Service');
const incidenciaService = require('../../services/incidenciaService');

// Mockeamos dependencias externas
jest.mock('../../models/incidenciaModel', () => ({
  getIncidenciaTypes: jest.fn(),
  conductorExists: jest.fn(),
  stationExists: jest.fn(),
  createIncidencia: jest.fn(),
}));

jest.mock('../../lib/s3Service', () => ({
  uploadFile: jest.fn(),
  getPublicUrl: jest.fn(),
}));

describe('incidenciaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listIncidenciaTypes', () => {
    test('devuelve los tipos obtenidos del modelo', async () => {
      // OK
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);

      const result = await incidenciaService.listIncidenciaTypes();

      expect(result).toEqual(['Operatiu', 'Altres']);
      expect(incidenciaModel.getIncidenciaTypes).toHaveBeenCalledTimes(1);
    });
  });

  describe('createIncidencia', () => {
    const validData = {
      comentari: 'No funciona el conector',
      tipus: 'Operatiu',
      conductor: 18,
      estacio: 2440207,
    };

    test('falla si el comentario está vacío', async () => {
      // Errores de validación de entrada.
      await expect(
        incidenciaService.createIncidencia({ ...validData, comentari: '   ' })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'El comentario es obligatorio' });
    });

    test('falla si el tipo está vacío', async () => {
      // Errores de validación de entrada.
      await expect(
        incidenciaService.createIncidencia({ ...validData, tipus: '' })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'El tipo es obligatorio' });
    });

    test('falla si el conductor no es válido', async () => {
      // Errores de validación de entrada.
      await expect(
        incidenciaService.createIncidencia({ ...validData, conductor: 0 })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'Conductor no válido' });
    });

    test('falla si la estación no es válida', async () => {
      // Errores de validación de entrada.
      await expect(
        incidenciaService.createIncidencia({ ...validData, estacio: -1 })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'Estación no válida' });
    });

    test('falla si el tipo no existe en el enum', async () => {
      // Errores de validación de entrada.
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Avariat', 'Altres']);

      await expect(
        incidenciaService.createIncidencia(validData)
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'El tipo seleccionado no es válido' });
    });

    test('falla si el conductor no existe', async () => {
      // No existe el conductor en la base de datos.
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(false);
      incidenciaModel.stationExists.mockResolvedValue(true);

      await expect(
        incidenciaService.createIncidencia(validData)
      ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'El conductor no existe' });
    });

    test('falla si la estación no existe', async () => {
      // No existe la estación en la base de datos.
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(true);
      incidenciaModel.stationExists.mockResolvedValue(false);

      await expect(
        incidenciaService.createIncidencia(validData)
      ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'La estación no existe' });
    });

    test('crea incidencia sin archivo cuando datos son válidos', async () => {
      // OK
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
        })
      );
      expect(result).toEqual(expect.objectContaining({ id: 10 }));
    });

    test('crea incidencia con archivo cuando mime es válido', async () => {
      // OK
      incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
      incidenciaModel.conductorExists.mockResolvedValue(true);
      incidenciaModel.stationExists.mockResolvedValue(true);
      uploadFile.mockResolvedValue('uploads/abc.jpg');
      getPublicUrl.mockReturnValue('https://bucket.s3.eu-north-1.amazonaws.com/uploads/abc.jpg');
      incidenciaModel.createIncidencia.mockResolvedValue({ id: 11, ...validData });

      const file = {
        buffer: Buffer.from('img'),
        originalname: 'foto.jpg',
        mimetype: 'image/jpeg',
      };

      await incidenciaService.createIncidencia(validData, file);

      expect(uploadFile).toHaveBeenCalledWith(file.buffer, 'foto.jpg', 'image/jpeg');
      expect(getPublicUrl).toHaveBeenCalledWith('uploads/abc.jpg');
      expect(incidenciaModel.createIncidencia).toHaveBeenCalledWith(
        expect.objectContaining({
          arxiu: 'https://bucket.s3.eu-north-1.amazonaws.com/uploads/abc.jpg',
        })
      );
    });

    describe('flujo incidencia solucionada', () => {
      const solvedData = {
        comentari: 'La Incidencia está solucionada',
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
            comentari: 'La Incidencia está solucionada',
            tipus: 'Operatiu',
            conductor: 18,
            estacio: 2440207,
            arxiu: null,
          })
        );
        expect(result).toEqual(expect.objectContaining({ id: 99 }));
      });

      test('falla en incidencia solucionada si Operatiu no existe en enum', async () => {
        incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Avariat', 'Altres']);

        await expect(incidenciaService.createIncidencia(solvedData)).rejects.toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'El tipo seleccionado no es válido',
        });

        expect(incidenciaModel.createIncidencia).not.toHaveBeenCalled();
      });

      test('no intenta subir archivo si incidencia solucionada no trae adjunto', async () => {
        // No se intenta subir archivo si incidencia solucionada no trae adjunto.
        incidenciaModel.getIncidenciaTypes.mockResolvedValue(['Operatiu', 'Altres']);
        incidenciaModel.conductorExists.mockResolvedValue(true);
        incidenciaModel.stationExists.mockResolvedValue(true);
        incidenciaModel.createIncidencia.mockResolvedValue({ id: 100, ...solvedData, arxiu: null });

        await incidenciaService.createIncidencia(solvedData);

        expect(uploadFile).not.toHaveBeenCalled();
        expect(getPublicUrl).not.toHaveBeenCalled();
        expect(incidenciaModel.createIncidencia).toHaveBeenCalledWith(
          expect.objectContaining({
            tipus: 'Operatiu',
            comentari: 'La Incidencia está solucionada',
            arxiu: null,
          })
        );
      });
    });
  });
});
