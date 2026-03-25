const { getDistanceInKm } = require('../../services/locationService');

describe('LocationService - getDistanceInKm', () => {
  test('getDistanceInKm devuelve 0 cuando calculamos la distancia de un punto con si mismo', () => {
    const lat = 41.3879;
    const lon = 2.16992;
    const distance = getDistanceInKm(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });

  test('getDistanceInKm calcula correctamente la distancia entre Barcelona y Madrid (que sabemos que es alrededor de 505km)', () => {
    const bcn = { lat: 41.3879, lon: 2.16992 };
    const mad = { lat: 40.4167, lon: -3.70379 };

    const distance = getDistanceInKm(bcn.lat, bcn.lon, mad.lat, mad.lon);

    // La distancia real es aprox 505km, pero damos margen de error
    expect(distance).toBeGreaterThan(500);
    expect(distance).toBeLessThan(510);
  });

  test('getDistanceInKm calcula correctamente la distancia entre dos puntos cercanos', () => {
    // Dos puntos en Barcelona separados por unos metros
    const p1 = { lat: 41.3879, lon: 2.16992 };
    const p2 = { lat: 41.3880, lon: 2.17000 };

    const distance = getDistanceInKm(p1.lat, p1.lon, p2.lat, p2.lon);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(0.1); //a menos de 100m
  });
});
