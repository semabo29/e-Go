const { getAllStations } = require('../../models/stationModel');
const { pool } = require('../../lib/db');

// mock del pool
jest.mock('../../lib/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('StationModel - consultas en BD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('se filtra por coordenadas', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await getAllStations({ north: 41.5, south: 41.0, east: 2.5, west: 2.0 });

    const queryCall = pool.query.mock.calls[0][0];
    const queryParams = pool.query.mock.calls[0][1];

    expect(queryCall).toContain('latitud <= $1');
    expect(queryCall).toContain('latitud >= $2');
    expect(queryParams).toEqual([41.5, 41.0, 2.5, 2.0]);
  });

  //añadir tests de filtros aqui
});
