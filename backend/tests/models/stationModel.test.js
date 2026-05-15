const { pool } = require('../../lib/db');
const {
  upsertStation,
  searchStations,
} = require('../../models/stationModel');

jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
}));

/** Estación tal como llega de la API de Open Data (sync). */
function baseApiStation(overrides = {}) {
  return {
    id: 'EXT-100',
    promotor_gestor: 'Gestor',
    acces: 'Public',
    tipus_velocitat: 'Ràpida',
    tipus_connexi: 'CCS2',
    latitud: '41.38',
    longitud: '2.17',
    designaci_descriptiva: 'Estació Test',
    kw: '50',
    ac_dc: 'DC',
    adre_a: 'Carrer Major 1',
    municipi: 'Barcelona',
    provincia: 'Barcelona',
    ...overrides,
  };
}

describe('stationModel.searchStations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [{ id: 1, nom: 'X' }] });
  });

  // El HTTP no llama al modelo sin `q` (controller devuelve []); aquí probamos el modelo directamente.
  test('sin q pero con minKw añade solo filtro de potencia', async () => {
    await searchStations(undefined, { minKw: 22 });

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/nom ILIKE/i);
    expect(sql).toContain('kw >= $1');
    expect(values).toEqual([22]);
  });

  test('solo maxKw sin minKw ni texto de búsqueda', async () => {
    await searchStations('', { maxKw: 100 });

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/nom ILIKE/i);
    expect(sql).toContain('kw <= $1');
    expect(values).toEqual([100]);
  });

  test('con q busca en nom, municipi y adreca con el mismo placeholder', async () => {
    await searchStations('bcn', {});

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toMatch(/nom ILIKE \$1 OR municipi ILIKE \$1 OR adreca ILIKE \$1/i);
    expect(values[0]).toBe('%bcn%');
  });

  test('encuentra por municipi aunque el nom no coincida', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: 9, nom: 'Punto X', municipi: 'Girona' }],
    });

    await searchStations('Girona', {});

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('municipi ILIKE');
    expect(values[0]).toBe('%Girona%');
  });

  test('encuentra por adreca (columna adreca en ILIKE)', async () => {
    await searchStations('Diagonal', {});

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('adreca ILIKE');
  });

  test('q vacío no añade condición de texto', async () => {
    await searchStations('', { connectorType: 'CCS' });

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/nom ILIKE/i);
    expect(sql).toContain('tipus_connexio ILIKE');
    expect(values[0]).toBe('%CCS%');
  });

  test('sin condiciones: SELECT sin WHERE', async () => {
    await searchStations(null, {});

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('SELECT DISTINCT * FROM ego.estaciones');
    expect(sql).not.toContain(' WHERE ');
    expect(values).toEqual([]);
  });

  test('combina q con todos los filtros de potencia y conector', async () => {
    await searchStations('test', {
      minKw: 22,
      maxKw: 150,
      connectorType: 'CCS2',
      ac_dc: 'DC',
    });

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('nom ILIKE $1');
    expect(sql).toContain('kw >=');
    expect(sql).toContain('kw <=');
    expect(sql).toContain('tipus_connexio ILIKE');
    expect(sql).toContain('ac_dc ILIKE');
    expect(values).toEqual(['%test%', 22, 150, '%CCS2%', '%DC%']);
  });

  test('devuelve las filas de pool.query', async () => {
    const rows = [{ id: 3, nom: 'A' }, { id: 4, nom: 'B' }];
    pool.query.mockResolvedValue({ rows });

    const result = await searchStations('a', {});

    expect(result).toEqual(rows);
  });
});

describe('stationModel.upsertStation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  test('mapea campos de la API catalana a los parámetros del INSERT', async () => {
    const est = baseApiStation();

    await upsertStation(est);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (external_id) DO UPDATE');
    expect(sql).toContain('WHERE ego.estaciones.is_manual = false');
    expect(values).toEqual([
      'EXT-100',
      'Gestor',
      'Public',
      'Ràpida',
      'CCS2',
      41.38,
      2.17,
      'Estació Test',
      50,
      'DC',
      'Carrer Major 1',
      'Barcelona',
      'Barcelona',
    ]);
  });

  test('kw ausente o inválido se guarda como 0', async () => {
    await upsertStation(baseApiStation({ kw: undefined }));

    const values = pool.query.mock.calls[0][1];
    expect(values[8]).toBe(0);

    pool.query.mockClear();
    await upsertStation(baseApiStation({ kw: '' }));

    expect(pool.query.mock.calls[0][1][8]).toBe(0);
  });

  test('coordenadas como string se parsean a número', async () => {
    await upsertStation(baseApiStation({ latitud: '41.5', longitud: '2.1' }));

    const values = pool.query.mock.calls[0][1];
    expect(values[5]).toBe(41.5);
    expect(values[6]).toBe(2.1);
  });

  test('segunda llamada con mismo external_id reutiliza el upsert (update en conflicto)', async () => {
    await upsertStation(baseApiStation({ designaci_descriptiva: 'Nombre v1' }));
    await upsertStation(baseApiStation({ designaci_descriptiva: 'Nombre v2' }));

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][1][0]).toBe('EXT-100');
    expect(pool.query.mock.calls[1][1][7]).toBe('Nombre v2');
    expect(pool.query.mock.calls[0][0]).toBe(pool.query.mock.calls[1][0]);
  });

  test('el SQL no actualiza estaciones manuales en conflicto', async () => {
    await upsertStation(baseApiStation());

    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/is_manual\s*=\s*false/i);
    expect(sql).toContain('WHERE ego.estaciones.is_manual = false');
  });
});
