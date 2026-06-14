// Acceso a BD para usuarios: buscar por email y crear usuario
const { pool, USUARIOS_TABLE, CONDUCTORES_TABLE, SUBSCRIPTIONS_TABLE, ADMINS_TABLE, EMPRESAS_TABLE, RESENYES_TABLE, AMIGOS_TABLE, CONDUCTOR_SKINS_TABLE, CARGAS_TABLE } = require('../lib/db');
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

async function findConductorByEmail(email) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.username, u.is_banned, u.banned_reason, u.created_at, u.updated_at
     FROM ${USUARIOS_TABLE} u
     JOIN ${CONDUCTORES_TABLE} c ON c.user_id = u.id
     WHERE u.email = $1`,
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

async function findConductorByEmailWithPassword(email) {
  const result = await withPasswordColumnRetry(() =>
    pool.query(
      `SELECT u.id, u.email, u.username, u.password_hash, u.is_banned, u.banned_reason, u.created_at, u.updated_at
       FROM ${USUARIOS_TABLE} u
       JOIN ${CONDUCTORES_TABLE} c ON c.user_id = u.id
       WHERE u.email = $1`,
      [email]
    )
  );
  return result.rows[0] || null;
}

/** Usuario en admins con hash de contraseña (login admin local; no exige conductor). */
async function findAdminByEmailWithPassword(email) {
  const result = await withPasswordColumnRetry(() =>
    pool.query(
      `SELECT u.id, r.user_id, u.email, u.username, u.password_hash, r.created_at AS admin_since
       FROM ${ADMINS_TABLE} r
       INNER JOIN ${USUARIOS_TABLE} u ON u.id = r.user_id
       WHERE u.email = $1`,
      [email]
    )
  );
  return result.rows[0] || null;
}

/** Usuario en empresas con hash de contraseña (login empresa local; no exige conductor). */
async function findCompanyByEmailWithPassword(email) {
  const result = await withPasswordColumnRetry(() =>
    pool.query(
      `SELECT u.id, r.user_id, u.email, u.username, u.password_hash, r.nombre, r.created_at AS company_since
       FROM ${EMPRESAS_TABLE} r
       INNER JOIN ${USUARIOS_TABLE} u ON u.id = r.user_id
       WHERE u.email = $1`,
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
    `SELECT u.id, u.username, u.email, c.punts, u.created_at, 
      exists(select * from ${SUBSCRIPTIONS_TABLE} where usuari_id = $1) as premium,
      exists(select * from ${ADMINS_TABLE} where user_id = $1) as admin,
      exists(select * from ${EMPRESAS_TABLE} where user_id = $1) as empresa,
      (select avg(puntuacio) from ${RESENYES_TABLE} where usuari_id = $1) as valoracio,
      (SELECT count(*) FROM ${AMIGOS_TABLE} WHERE (usuari_id1 = $1 OR usuari_id2 = $1) AND per_acceptar IS NULL) AS amics,
      (select posicio FROM (SELECT user_id, (ROW_NUMBER() OVER ( ORDER BY punts DESC)) AS posicio FROM ${CONDUCTORES_TABLE}) WHERE user_id = $1),
      (SELECT s.arxiu_asset FROM ego.conductor_skins cs, ego.skins s WHERE cs.conductor_id = $1 AND cs.equipada = TRUE AND s.id = cs.skin_id) AS skin,
      (SELECT sum(duracion_minutos) AS carrega FROM ${CARGAS_TABLE} WHERE usuari_id = $1)
    FROM ${USUARIOS_TABLE} u, ${CONDUCTORES_TABLE} c
    WHERE u.id = $1 AND c.user_id = $1`,
    [userId]
  );
  if (!user) {
    throw new Error('User not found');
  }
  return user.rows[0];
}

async function updateUser(userId, username) {
  const updates = [];

  if (!username) {
    throw new Error('Falta el campo username');
  }

  const query = `UPDATE ${USUARIOS_TABLE}
       SET username = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, username, created_at, updated_at`;
  const result = await pool.query(query, [userId, username]);
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

async function ensureConductorForUser(userId) {
  await pool.query(
    `INSERT INTO ${CONDUCTORES_TABLE} (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function backfillConductoresFromUsuarios() {
  const result = await pool.query(
    `INSERT INTO ${CONDUCTORES_TABLE} (user_id)
     SELECT u.id
     FROM ${USUARIOS_TABLE} u
     LEFT JOIN ${CONDUCTORES_TABLE} c ON c.user_id = u.id
     WHERE c.user_id IS NULL`
  );
  return result.rowCount || 0;
}

/** Actualiza el nombre comercial; companyUserId es empresas.user_id (mismo que usuarios.id). */
async function updateCompanyNombre(companyUserId, nombre) {
  const trimmed = String(nombre ?? '').trim();
  if (!trimmed) {
    const err = new Error('El nombre no puede estar vacio');
    err.code = 'BAD_REQUEST';
    throw err;
  }
  const safe = trimmed.slice(0, 255);
  const id = Number(companyUserId);
  if (!Number.isFinite(id) || id <= 0) {
    const err = new Error('Identificador invalido');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const upd = await pool.query(
    `UPDATE ${EMPRESAS_TABLE}
     SET nombre = $1
     WHERE user_id = $2
     RETURNING user_id, nombre, created_at`,
    [safe, id]
  );
  if (!upd.rows[0]) return null;

  const emp = upd.rows[0];
  const usrRes = await pool.query(
    `SELECT id, email, username FROM ${USUARIOS_TABLE} WHERE id = $1`,
    [emp.user_id]
  );
  const usr = usrRes.rows[0];
  if (!usr) return null;

  return {
    id: usr.id,
    user_id: emp.user_id,
    email: usr.email,
    username: usr.username,
    nombre: emp.nombre,
    created_at: emp.created_at,
  };
}

module.exports = {
  findByEmail,
  findConductorByEmail,
  findByEmailWithPassword,
  findConductorByEmailWithPassword,
  findAdminByEmailWithPassword,
  findCompanyByEmailWithPassword,
  findById,
  findByIdWithBanStatus,
  listAllUsersForAdmin,
  setUserBanStatus,
  getInfoUser,
  updateUser,
  createUser,
  createLocalUser,
  setPasswordHashByUserId,
  ensureConductorForUser,
  backfillConductoresFromUsuarios,
  updateCompanyNombre,
};
