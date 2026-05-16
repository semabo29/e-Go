const geocodeService = require('../services/geocodeService');
const geocodeController = require('../controllers/geocodeController');

jest.mock('../services/geocodeService');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// Tests unitarios del controlador: se mockea geocodeService para cubrir
// validación local, mapeo HTTP y ramas del catch sin llamar a Google.
describe('geocodeController', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('autocomplete', () => {
    // El controlador corta antes del servicio si hay menos de 3 caracteres útiles.
    test('devuelve [] si input corto sin llamar al servicio', async () => {
      const req = { query: { input: 'ab' } };
      const res = mockRes();

      await geocodeController.autocomplete(req, res);

      expect(geocodeService.autocompleteAddress).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });

    // Tras trim, solo espacios cuenta como input vacío → misma respuesta que input corto.
    test('devuelve [] si input solo espacios', async () => {
      const req = { query: { input: '   ' } };
      const res = mockRes();

      await geocodeController.autocomplete(req, res);

      expect(geocodeService.autocompleteAddress).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });

    // trim del query y delegación al servicio.
    test('devuelve resultados del servicio', async () => {
      const predictions = [{ placeId: 'pid1', label: 'Carrer' }];
      geocodeService.autocompleteAddress.mockResolvedValue(predictions);
      const req = { query: { input: '  Barcelona  ' } };
      const res = mockRes();

      await geocodeController.autocomplete(req, res);

      expect(geocodeService.autocompleteAddress).toHaveBeenCalledWith('Barcelona');
      expect(res.json).toHaveBeenCalledWith(predictions);
    });

    //503 (servidor sin api key de Google Maps).
    test('responde 503 en CONFIG', async () => {
      const err = new Error('Google Maps API key no configurada');
      err.code = 'CONFIG';
      geocodeService.autocompleteAddress.mockRejectedValue(err);
      const req = { query: { input: 'Barcelona' } };
      const res = mockRes();

      await geocodeController.autocomplete(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cerca d’adreces no disponible (falta configuració del servidor).',
      });
    });

    // 400 con el mensaje del servicio.
    test('responde 400 en VALIDATION', async () => {
      const err = new Error('input inválido');
      err.code = 'VALIDATION';
      geocodeService.autocompleteAddress.mockRejectedValue(err);
      const req = { query: { input: 'Barcelona' } };
      const res = mockRes();

      await geocodeController.autocomplete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'input inválido' });
    });

    // 502 y log en consola.
    test('responde 502 en error genérico', async () => {
      geocodeService.autocompleteAddress.mockRejectedValue(new Error('network'));
      const req = { query: { input: 'Barcelona' } };
      const res = mockRes();

      await geocodeController.autocomplete(req, res);

      expect(console.error).toHaveBeenCalledWith('geocode autocomplete:', expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No s’ha pogut contactar amb el servei de mapes.',
      });
    });
  });

  describe('place', () => {
    // no se llama a placeDetails sin placeId.
    test('responde 400 si falta placeId', async () => {
      const req = { query: {} };
      const res = mockRes();

      await geocodeController.place(req, res);

      expect(geocodeService.placeDetails).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'placeId és obligatori' });
    });

    // 400 del controlador, no del servicio.
    test('responde 400 si placeId solo espacios', async () => {
      const req = { query: { placeId: '   ' } };
      const res = mockRes();

      await geocodeController.place(req, res);

      expect(geocodeService.placeDetails).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'placeId és obligatori' });
    });

    // trim de placeId y respuesta JSON del servicio.
    test('devuelve detalles del servicio', async () => {
      const details = { lat: 41.39, lng: 2.17, formattedAddress: 'Addr' };
      geocodeService.placeDetails.mockResolvedValue(details);
      const req = { query: { placeId: '  pid1  ' } };
      const res = mockRes();

      await geocodeController.place(req, res);

      expect(geocodeService.placeDetails).toHaveBeenCalledWith('pid1');
      expect(res.json).toHaveBeenCalledWith(details);
    });

    // 503 (servidor sin api key de Google Maps).
    test('responde 503 en CONFIG', async () => {
      const err = new Error('Google Maps API key no configurada');
      err.code = 'CONFIG';
      geocodeService.placeDetails.mockRejectedValue(err);
      const req = { query: { placeId: 'pid1' } };
      const res = mockRes();

      await geocodeController.place(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cerca d’adreces no disponible (falta configuració del servidor).',
      });
    });

    // 400 del servicio.
    test('responde 400 en VALIDATION del servicio', async () => {
      const err = new Error('placeId obligatori');
      err.code = 'VALIDATION';
      geocodeService.placeDetails.mockRejectedValue(err);
      const req = { query: { placeId: 'pid1' } };
      const res = mockRes();

      await geocodeController.place(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'placeId obligatori' });
    });

    // 502 con mensaje específico de place.
    test('responde 502 en error genérico', async () => {
      geocodeService.placeDetails.mockRejectedValue(new Error('network'));
      const req = { query: { placeId: 'pid1' } };
      const res = mockRes();

      await geocodeController.place(req, res);

      expect(console.error).toHaveBeenCalledWith('geocode place:', expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No s’ha pogut obtenir la ubicació.',
      });
    });
  });
});
