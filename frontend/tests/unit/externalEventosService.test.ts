import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as EventosApi from '@/constants/eventosApi';
import {
  fetchEventosCercaDeEstacion,
  getEventoMapCoordinates,
  type EventoExterno,
} from '@/services/externalEventosService';

/** Distancia en metros entre dos puntos . */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Construye un evento. */
function baseEvento(over: Partial<EventoExterno> = {}): EventoExterno {
  return {
    id: 1,
    titulo: 'Test',
    imagen_url: null,
    distancia_km: 0,
    ...over,
  };
}

function mockFetchResponse(
  partial: Partial<Awaited<ReturnType<typeof fetch>>> & { ok: boolean }
): Awaited<ReturnType<typeof fetch>> {
  return partial as unknown as Awaited<ReturnType<typeof fetch>>;
}

describe('getEventoMapCoordinates', () => {
  const stationLat = 41.387;
  const stationLon = 2.168;

  // Formato principal (lat / lon).
  test('usa lat y lon numéricos de la API', () => {
    const c = getEventoMapCoordinates(
      baseEvento({ lat: 41.4, lon: 2.18, distancia_km: 1 }),
      stationLat,
      stationLon
    );
    expect(c).toEqual({ latitude: 41.4, longitude: 2.18 });
  });

  test('usa lat y lon como cadena', () => {
    const c = getEventoMapCoordinates(
      baseEvento({ lat: '41.5', lon: '2.2', distancia_km: 1 }),
      stationLat,
      stationLon
    );
    expect(c).toEqual({ latitude: 41.5, longitude: 2.2 });
  });



  // Sin coordenadas válidas: estimación geográfica a partir de distancia_km e id (rumbo).
  test('sin coordenadas pero con distancia: punto aproximadamente a distancia_km de la estación', () => {
    const dKm = 0.5;
    const c = getEventoMapCoordinates(
      baseEvento({ id: 7, distancia_km: dKm }),
      stationLat,
      stationLon
    );
    expect(c).not.toBeNull();
    const m = haversineMeters(stationLat, stationLon, c!.latitude, c!.longitude);
    expect(m).toBeGreaterThan(dKm * 1000 * 0.95);
    expect(m).toBeLessThan(dKm * 1000 * 1.05);
  });

  // Coordenadas inválidas no deben usarse; si hay distancia, entra el fallback.
  test('ignora coordenadas no numéricas y usa distancia_km si existe', () => {
    const c = getEventoMapCoordinates(
      baseEvento({ lat: 'n/a', lon: null, distancia_km: 0.3, id: 3 }),
      stationLat,
      stationLon
    );
    expect(c).not.toBeNull();
    const m = haversineMeters(stationLat, stationLon, c!.latitude, c!.longitude);
    expect(m).toBeGreaterThan(0.3 * 1000 * 0.95);
  });

  test('devuelve null si no hay coordenadas ni distancia válida', () => {
    expect(getEventoMapCoordinates(baseEvento({ distancia_km: 0 }), stationLat, stationLon)).toBeNull();
    expect(
      getEventoMapCoordinates(baseEvento({ lat: 'bad', lon: 'bad', distancia_km: 0 }), stationLat, stationLon)
    ).toBeNull();
  });
});

describe('fetchEventosCercaDeEstacion', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Petición GET con cabecera "Authorization: Token <secret>".
  test('GET con Authorization Token y radio por defecto en la URL', async () => {
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('unittesttoken');

    const payload = { count: 1, next: null, previous: null, results: [] };
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: true,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
      })
    );

    const out = await fetchEventosCercaDeEstacion(41, 2);
    expect(out).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('lat=41');
    expect(url).toContain('lon=2');
    expect(url).toContain(
      `radio_km=${encodeURIComponent(String(EventosApi.EVENTOS_RADIO_KM_DEFAULT))}`
    );
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get('Authorization')).toBe('Token unittesttoken');
    expect(headers.get('Accept')).toBe('application/json');
  });

  test('incluye radio_km personalizado en la URL cuando se pasa al servicio', async () => {
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('tok');
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: true,
        json: async () => ({ count: 0, next: null, previous: null, results: [] }),
      })
    );

    await fetchEventosCercaDeEstacion(41, 2, 2.5);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(`radio_km=${encodeURIComponent('2.5')}`);
  });


  // si no hay token, se lanza un error.
  test('lanza error si no hay token (no se llama a fetch)', async () => {
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('');
    await expect(fetchEventosCercaDeEstacion(1, 2)).rejects.toThrow('MISSING_EVENTOS_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // si la respuesta no es ok, se lanza un error.
  test('lanza error con status y cuerpo truncado si la respuesta no es ok', async () => {
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('tok');
    const errorBody = 'Unauthorized: invalid token header';
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 401,
        text: async () => errorBody,
      })
    );

    await expect(fetchEventosCercaDeEstacion(1, 2)).rejects.toThrow(
      `Eventos 401: ${errorBody.slice(0, 160)}`
    );
  });

  test('lanza error aunque falle leer el cuerpo de la respuesta', async () => {
    jest.spyOn(EventosApi, 'getEventosApiToken').mockReturnValue('tok');
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 500,
        text: async () => {
          throw new Error('network read failed');
        },
      })
    );

    await expect(fetchEventosCercaDeEstacion(1, 2)).rejects.toThrow('Eventos 500:');
  });
});
