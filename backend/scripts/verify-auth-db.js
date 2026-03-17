/**
 * Verifica que la tabla de usuarios existe y el backend puede consultarla.
 * Uso: node scripts/verify-auth-db.js
 */
const userModel = require('../models/userModel');

async function verify() {
  const user = await userModel.findByEmail('no-existe@ejemplo.com');
  console.log('Consulta OK. Usuario (debería ser null):', user);
  process.exit(0);
}

verify().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
