/**
 * Crea en RDS la tabla ego.estaciones que usa el backend (rutas /stations).
 * La función set_updated_at debe existir (ej. tras ejecutar setup-users-table.js).
 * Uso: node scripts/setup-stations-table.js
 */
const { pool } = require('../lib/db');

async function setup() {
  await pool.query('CREATE SCHEMA IF NOT EXISTS ego');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ego.estaciones (
      id                     SERIAL PRIMARY KEY,
      external_id            VARCHAR(100) UNIQUE,
      promotor               VARCHAR(255),
      acces                  VARCHAR(100),
      tipus_velocitat        VARCHAR(100),
      tipus_connexio         VARCHAR(100),
      latitud                DECIMAL(12, 9),
      longitud               DECIMAL(12, 9),
      nom                    VARCHAR(255),
      kw                     DECIMAL(10, 2),
      ac_dc                  VARCHAR(20),
      adreca                 TEXT,
      municipi               VARCHAR(100),
      provincia              VARCHAR(100),
      created_at             TIMESTAMPTZ DEFAULT NOW(),
      updated_at             TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query('DROP TRIGGER IF EXISTS estaciones_updated_at ON ego.estaciones');
  await pool.query(`
    CREATE TRIGGER estaciones_updated_at
      BEFORE UPDATE ON ego.estaciones
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at()
  `);

  console.log('Tabla ego.estaciones creada o ya existía.');
  await pool.end();
}

setup().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
