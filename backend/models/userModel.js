// Acceso a BD para usuarios: buscar por email y crear usuario
const { pool, USUARIOS_TABLE } = require('../lib/db');
let passwordHashColumnEnsured = false;

async function ensurePasswordHashColumn() {
  if (passwordHashColumnEnsured) return;
  await pool.query(
    `ALTER TABLE ${USUARIOS_TABLE}
     ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`
  );
  passwordHashColumnEnsured = true;
}

async function withPasswordColumnRetry(queryFn) {
  try {
    return await queryFn();
  } catch (err) {
    if (err?.code !== '42703') throw err;
    await ensurePasswordHashColumn();
    return queryFn();
  }
}

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, username, created_at, updated_at FROM ${USUARIOS_TABLE} WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findByEmailWithPassword(email) {
  const result = await withPasswordColumnRetry(() =>
    pool.query(
      `SELECT id, email, username, password_hash, created_at, updated_at
       FROM ${USUARIOS_TABLE}
       WHERE email = $1`,
      [email]
    )
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, email, username, created_at, updated_at FROM ${USUARIOS_TABLE} WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function createUser(email, username) {
  const result = await pool.query(
    `INSERT INTO ${USUARIOS_TABLE} (email, username) VALUES ($1, $2)
     RETURNING id, email, username, created_at, updated_at`,
    [email, username]
  );
  return result.rows[0];
}

async function createLocalUser(email, username, passwordHash) {
  const result = await withPasswordColumnRetry(() =>
    pool.query(
      `INSERT INTO ${USUARIOS_TABLE} (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at, updated_at`,
      [email, username, passwordHash]
    )
  );
  return result.rows[0];
}

async function setPasswordHashByUserId(userId, passwordHash) {
  const result = await withPasswordColumnRetry(() =>
    pool.query(
      `UPDATE ${USUARIOS_TABLE}
       SET password_hash = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, username, created_at, updated_at`,
      [userId, passwordHash]
    )
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  findByEmailWithPassword,
  findById,
  createUser,
  createLocalUser,
  setPasswordHashByUserId,
};
