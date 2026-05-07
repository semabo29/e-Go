// Acceso a BD para usuarios: buscar por email y crear usuario
const { pool, USUARIOS_TABLE, CONDUCTORES_TABLE, SUBSCRIPTIONS_TABLE, ADMINS_TABLE, EMPRESAS_TABLE } = require('../lib/db');
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
    `SELECT id, email, username, is_banned, banned_at, banned_reason, created_at, updated_at
     FROM ${USUARIOS_TABLE}
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findByEmailWithPassword(email) {
  const result = await withPasswordColumnRetry(() =>
    pool.query(
      `SELECT id, email, username, password_hash, created_at, updated_at
       , is_banned, banned_at, banned_reason
       FROM ${USUARIOS_TABLE}
       WHERE email = $1`,
      [email]
    )
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, email, username, is_banned, banned_at, banned_reason, created_at, updated_at
     FROM ${USUARIOS_TABLE}
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function findByIdWithBanStatus(id) {
  const result = await pool.query(
    `SELECT id, is_banned, banned_at, banned_reason
     FROM ${USUARIOS_TABLE}
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listAllUsersForAdmin() {
  const result = await pool.query(
    `SELECT id, email, username, is_banned, banned_at, banned_reason, created_at, updated_at
     FROM ${USUARIOS_TABLE}
     ORDER BY created_at DESC`
  );
  return result.rows;
}

async function setUserBanStatus(userId, { isBanned, reason }) {
  const result = await pool.query(
    `UPDATE ${USUARIOS_TABLE}
     SET is_banned = $2,
         banned_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
         banned_reason = CASE WHEN $2 THEN NULLIF($3, '') ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, username, is_banned, banned_at, banned_reason, created_at, updated_at`,
    [userId, isBanned, reason || null]
  );
  return result.rows[0] || null;
}

async function getInfoUser(userId) {
  const user = await pool.query(
  //  `SELECT username, email, punts, u.created_at, exists(select * from ${SUBSCRIPTIONS_TABLE} where usuari_id = $1) as premium, exists(select * from ${ADMINS_TABLE} where user_id = $1) as admin, exists(select * from ${EMPRESAS_TABLE} where user_id = $1) as empresa FROM ${USUARIOS_TABLE} u, ${CONDUCTORES_TABLE} c WHERE u.id = $1 AND c.user_id = $1`,
    `SELECT u.id, u.username, u.email, c.punts, u.created_at, exists(select * from ego.subscription where usuari_id = $1) as premium, exists(select * from ego.admins where user_id = $1) as admin, exists(select * from ego.empresas where user_id = $1) as empresa FROM ${USUARIOS_TABLE} u, ${CONDUCTORES_TABLE} c WHERE u.id = $1 AND c.user_id = $1`,
    [userId]
  );
  if (!user) {
    throw new Error('User not found');
  }
  return user.rows[0];
}

async function updateUser(userId, username, email) {
  const updates = [];
  const values = [userId];

  if (username) {
    values.push(username);
    updates.push(`username = $${values.length}`);
  }
  if (email) {
    values.push(email);
    updates.push(`email = $${values.length}`);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  const query = `UPDATE ${USUARIOS_TABLE}
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, username, created_at, updated_at`;
  const result = await pool.query(query, values);
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
       RETURNING id, email, username, is_banned, banned_at, banned_reason, created_at, updated_at`,
      [userId, passwordHash]
    )
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  findByEmailWithPassword,
  findById,
  findByIdWithBanStatus,
  listAllUsersForAdmin,
  setUserBanStatus,
  getInfoUser,
  updateUser,
  createUser,
  createLocalUser,
  setPasswordHashByUserId,
};
