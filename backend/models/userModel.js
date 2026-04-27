// Acceso a BD para usuarios: buscar por email y crear usuario
const { pool, USUARIOS_TABLE } = require('../lib/db');

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, username, created_at, updated_at FROM ${USUARIOS_TABLE} WHERE email = $1`,
    [email]
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

module.exports = {
  findByEmail,
  findById,
  createUser,
};
