/**
 * Establece la misma contraseña local (bcrypt) para todos los usuarios que son
 * admin o empresa. Pensado para entornos de desarrollo / pruebas.
 *
 * Uso (desde la carpeta backend):
 *   node scripts/setPrivilegedDevPassword.js --yes
 *
 * Contraseña por defecto: 12345678 (mínimo 6 caracteres, válida con validateLocalCredentials).
 * Opcional: PASSWORD=otraClave node scripts/setPrivilegedDevPassword.js --yes
 */
const bcrypt = require('bcryptjs');
const { pool, USUARIOS_TABLE, ADMINS_TABLE, EMPRESAS_TABLE } = require('../lib/db');

const DEFAULT_PASSWORD = '12345678';
const BCRYPT_ROUNDS = 12;

async function main() {
  if (!process.argv.includes('--yes')) {
    console.error(
      'Este script modifica contraseñas en la BD. Vuelve a ejecutarlo con --yes para confirmar.'
    );
    process.exit(1);
  }

  const plain = process.env.PASSWORD || DEFAULT_PASSWORD;
  if (plain.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  await pool.query(
    `ALTER TABLE ${USUARIOS_TABLE} ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`
  );

  const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);

  const result = await pool.query(
    `UPDATE ${USUARIOS_TABLE} u
     SET password_hash = $1, updated_at = NOW()
     FROM (
       SELECT user_id FROM ${ADMINS_TABLE}
       UNION
       SELECT user_id FROM ${EMPRESAS_TABLE}
     ) p
     WHERE u.id = p.user_id`,
    [hash]
  );

  console.log(
    `Actualizados ${result.rowCount} usuario(s) (admins ∪ empresas). Contraseña aplicada: longitud ${plain.length} caracteres.`
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
