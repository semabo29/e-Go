// Conexión a PostgreSQL. Schema/tabla en .env: DB_SCHEMA, DB_TABLE_USUARIOS
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// Host, User, Password, DB Name desde .env o variables de Lambda (RDS)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.NODE_ENV === 'test' ? false : { rejectUnauthorized: false },//necesario para RDS desde Lambda, pero si es testing desactivamos el ssl
});

// Tabla de usuarios y admins (ej. schema ego, tabla usuari)
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';
const DB_TABLE_USUARIOS = process.env.DB_TABLE_USUARIOS || 'usuari';
const DB_TABLE_ADMINS = process.env.DB_TABLE_ADMINS || 'admins';
const USUARIOS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_USUARIOS}"`;
const ADMINS_TABLE = `"${DB_SCHEMA}"."${DB_TABLE_ADMINS}"`;

module.exports = { pool, USUARIOS_TABLE, ADMINS_TABLE };
