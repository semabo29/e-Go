// Conexión a PostgreSQL. Schema/tabla en .env: DB_SCHEMA, DB_TABLE_USUARIOS
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

function normalizeIdentifier(value, fallback) {
  const raw = (value || fallback || '').toString().trim();
  // Avoid case-sensitive mismatches like "Usuari" vs real table usuari.
  return raw.replace(/"/g, '').toLowerCase();
}

// Host, User, Password, DB Name desde .env o variables de Lambda (RDS)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  // Desactivem SSL NOMÉS si s'està executant a GitHub Actions
  ssl: process.env.GITHUB_ACTIONS ? false : { rejectUnauthorized: false },
});

// Tabla de usuarios y admins (ej. schema ego, tabla usuari)
const DB_SCHEMA = normalizeIdentifier(process.env.DB_SCHEMA, 'public');
const DB_TABLE_USUARIOS = normalizeIdentifier(process.env.DB_TABLE_USUARIOS, 'usuari');
const DB_TABLE_CONDUCTORES = normalizeIdentifier(process.env.DB_TABLE_CONDUCTORES, 'conductor');
const DB_TABLE_ADMINS = normalizeIdentifier(process.env.DB_TABLE_ADMINS, 'admins');
const DB_TABLE_EMPRESAS = normalizeIdentifier(process.env.DB_TABLE_EMPRESAS, 'empresas');
const DB_TABLE_STATION_REQUESTS = normalizeIdentifier(process.env.DB_TABLE_STATION_REQUESTS, 'station_requests');
const DB_TABLE_SUBSCRIPTIONS = normalizeIdentifier(process.env.DB_TABLE_SUBSCRIPTIONS, 'subscription');
const USUARIOS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_USUARIOS}"`;
const CONDUCTORES_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_CONDUCTORES}"`;
const ADMINS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_ADMINS}"`;
const EMPRESAS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_EMPRESAS}"`;
const STATION_REQUESTS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_STATION_REQUESTS}"`;
const SUBSCRIPTIONS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_SUBSCRIPTIONS}"`;

module.exports = {
  pool,
  USUARIOS_TABLE,
  CONDUCTORES_TABLE,
  ADMINS_TABLE,
  EMPRESAS_TABLE,
  STATION_REQUESTS_TABLE,
  SUBSCRIPTIONS_TABLE,
};
