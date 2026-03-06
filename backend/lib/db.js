// Conexión a PostgreSQL. Schema/tabla en .env: DB_SCHEMA, DB_TABLE_USUARIOS
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
});

// Tabla de usuarios (ej. schema ego, tabla Usuari)
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';
const DB_TABLE_USUARIOS = process.env.DB_TABLE_USUARIOS || 'usuarios';
const USUARIOS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_USUARIOS}"`;

module.exports = { pool, USUARIOS_TABLE };
