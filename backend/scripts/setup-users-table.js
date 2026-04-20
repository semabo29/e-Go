/**
 * Crea en RDS (o la BD del .env) el schema y la tabla de usuarios
 * que usa el backend (DB_SCHEMA, DB_TABLE_USUARIOS).
 * Uso: node scripts/setup-users-table.js
 */
const { pool } = require('../lib/db');

const schema = process.env.DB_SCHEMA || 'public';
const table = process.env.DB_TABLE_USUARIOS || 'usuari';
// Nombre de tabla escapado para SQL (identificador)
const tableId = `"${schema}"."${table}"`;

async function setup() {
  // 1. Función para updated_at (en public, la usan todos)
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 2. Schema (ej. ego)
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

  // 3. Tabla de usuarios en ese schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${tableId} (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) NOT NULL UNIQUE,
      username   VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // 4. Trigger updated_at
  await pool.query(`DROP TRIGGER IF EXISTS usuarios_updated_at ON ${tableId}`);
  await pool.query(`
    CREATE TRIGGER usuarios_updated_at
      BEFORE UPDATE ON ${tableId}
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at()
  `);

  console.log(`Tabla ${tableId} creada o ya existía.`);
  await pool.end();
}

setup().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
