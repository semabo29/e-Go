import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  buildIncidenciaFormData,
  submitIncidencia,
  submitSolvedIncidencia,
} from '@/services/incidenciaApiService';
import {
  cancelChargingSession,
  endChargingSession,
  getActiveChargingSession,
  startChargingSession,
} from '@/services/chargingApiService';
import { appFetch } from '@/services/appFetch';

const API_BASE = 'http://test.api';

jest.mock('@/constants/api', () => ({
  getApiUrl: jest.fn(() => API_BASE),
}));

jest.mock('@/services/bannedUserSession', () => ({
  maybeHandleBannedResponse: jest.fn<any>().mockResolvedValue(undefined),
}));

function mockFetchJson(status: number, body: unknown, ok?: boolean) {
  const resolvedOk = ok ?? (status >= 200 && status < 300);
  return {
    ok: resolvedOk,
    status,
    json: jest.fn<any>().mockResolvedValue(body),
  } as unknown as Response;
}

describe('Fluxos de negoci via API — incidències', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn<any>() as jest.MockedFunction<typeof fetch>;
  });

  test('reportar problema envia POST /incidencias amb conductor, estació i tipus', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(
      mockFetchJson(201, { id: 1, tipus: 'Avariat' })
    );

    const formData = buildIncidenciaFormData({
      conductor: 42,
      estacio: 100,
      comentari: 'Connector trencat',
      tipus: 'Avariat',
    });

    const result = await submitIncidencia(formData);

    expect(result.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/incidencias`,
      expect.objectContaining({ method: 'POST', body: formData })
    );
  });

  test('reportar incidència solucionada envia tipus Operatiu', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(
      mockFetchJson(201, { id: 2, tipus: 'Operatiu' })
    );

    const result = await submitSolvedIncidencia(42, 100);

    expect(result.ok).toBe(true);
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = init.body as FormData;
    expect(body.get('tipus')).toBe('Operatiu');
    expect(body.get('conductor')).toBe('42');
    expect(body.get('estacio')).toBe('100');
  });

  test('incidència duplicada retorna conflict 409', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(
      mockFetchJson(409, { error: 'Ya has reportado esta incidencia para esta estación' }, false)
    );

    const result = await submitIncidencia(
      buildIncidenciaFormData({
        conductor: 1,
        estacio: 2,
        comentari: 'Altre cop',
        tipus: 'Avariat',
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.conflict).toBe(true);
    }
  });

  test('poden coexistir incidència Avariat i Operatiu obertes per la mateixa estació', async () => {
    (globalThis.fetch as jest.Mock<any>)
      .mockResolvedValueOnce(mockFetchJson(201, { id: 10, tipus: 'Avariat' }))
      .mockResolvedValueOnce(mockFetchJson(201, { id: 11, tipus: 'Operatiu' }));

    const problema = await submitIncidencia(
      buildIncidenciaFormData({
        conductor: 5,
        estacio: 99,
        comentari: 'No carrega',
        tipus: 'Avariat',
      })
    );
    const solucionada = await submitSolvedIncidencia(5, 99);

    expect(problema.ok).toBe(true);
    expect(solucionada.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('Fluxos de negoci via API — càrrega', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn<any>() as jest.MockedFunction<typeof fetch>;
  });

  test('iniciar sessió de càrrega envia POST /charging/start amb ubicació', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(
      mockFetchJson(200, {
        success: true,
        session: { id: 7, usuari_id: 1, estacio_id: 50, status: 'active' },
      })
    );

    await startChargingSession(1, 50, 41.39, 2.17);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/charging/start`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          usuari_id: 1,
          estacio_id: 50,
          ubicacion_lat: 41.39,
          ubicacion_lon: 2.17,
        }),
      })
    );
  });

  test('finalitzar sessió envia POST /charging/end amb durada i motiu', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(
      mockFetchJson(200, {
        success: true,
        message: 'ok',
        session: { id: 7, puntos_totales: 10 },
        pointsGained: { basePoints: 5, multiplier: 2, totalPoints: 10 },
        isPremium: false,
      })
    );

    await endChargingSession(7, 1, 45, 41.4, 2.18, 'manual');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/charging/end`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          session_id: 7,
          usuari_id: 1,
          duration_minutes: 45,
          ubicacion_final_lat: 41.4,
          ubicacion_final_lon: 2.18,
          end_reason: 'manual',
        }),
      })
    );
  });

  test('consultar sessió activa fa GET /charging/active', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(
      mockFetchJson(200, { session: null })
    );

    const session = await getActiveChargingSession(3);

    expect(session).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/charging/active?usuari_id=3`,
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('cancel·lar sessió envia POST /charging/cancel', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(mockFetchJson(200, {}));

    await cancelChargingSession(9, 'manual');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/charging/cancel`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ session_id: 9, reason: 'manual' }),
      })
    );
  });
});

describe('Fluxos de negoci via API — favorits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn<any>() as jest.MockedFunction<typeof fetch>;
  });

  test('afegir favorit envia POST /favorites', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(mockFetchJson(200, {}));

    await appFetch('/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuari_id: 12, estacio_id: 88 }),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/favorites`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ usuari_id: 12, estacio_id: 88 }),
      })
    );
  });

  test('treure favorit envia DELETE /favorites', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(mockFetchJson(200, {}));

    await appFetch('/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuari_id: 12, estacio_id: 88 }),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/favorites`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
