const stationService = require('../../services/stationService');
const { startScheduler } = require('../../lib/scheduler');

jest.mock('../../services/stationService', () => ({
  syncStations: jest.fn(),
}));

describe('scheduler', () => {
  let setIntervalSpy;
  let capturedIntervalFn;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedIntervalFn = null;

    setIntervalSpy = jest.spyOn(globalThis, 'setInterval').mockImplementation((fn) => {
      capturedIntervalFn = fn;
      return 1;
    });

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Debe lanzar una sincronización inicial al arrancar y programar
  // el intervalo por defecto de 5 minutos.
  test('ejecuta sincronización inicial y programa el intervalo por defecto', async () => {
    stationService.syncStations.mockResolvedValue(5);

    startScheduler();
    await Promise.resolve();

    expect(stationService.syncStations).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
    expect(consoleLogSpy).toHaveBeenCalledWith('Scheduler iniciado: Actualizando cada 5 minutos.');
  });

  // Al ejecutar manualmente la función capturada por setInterval,
  // el scheduler debe volver a llamar a syncStations (sincronización periódica).
  test('ejecuta sincronización periódica cuando se dispara el intervalo', async () => {
    stationService.syncStations.mockResolvedValue(3);

    startScheduler(1000);
    await Promise.resolve();

    expect(capturedIntervalFn).toEqual(expect.any(Function));

    await capturedIntervalFn();

    expect(stationService.syncStations).toHaveBeenCalledTimes(2);
  });

  // Si syncStations falla, el error debe registrarse en consola
  // y el scheduler debe seguir configurando el intervalo sin romperse.
  test('captura y registra errores de sincronización sin romper el scheduler', async () => {
    stationService.syncStations.mockRejectedValue(new Error('sync failed'));

    startScheduler(1000);
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Error en actualización automática:/),
      'sync failed'
    );
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
