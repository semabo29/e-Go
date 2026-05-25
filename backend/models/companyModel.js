const { pool, EMPRESAS_TABLE, USUARIOS_TABLE } = require('../lib/db');

async function findCompanyByEmail(email) {
  const result = await pool.query(
    `SELECT u.id, e.user_id, u.email, u.username, e.nombre, e.created_at
     FROM ${EMPRESAS_TABLE} e
     JOIN ${USUARIOS_TABLE} u ON u.id = e.user_id
     WHERE u.email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

module.exports = {
  findCompanyByEmail,
};
