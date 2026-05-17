/**
 * Instala keystores/debug.keystore (main) en ~/.android/debug.keystore
 * para que los builds locales usen la SHA-1 del equipo en Google Cloud.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const TEAM_SHA1 = '48:5D:FB:2C:91:EB:8C:35:4D:0E:53:8D:46:EF:F0:50:96:CC:AC:49';
const SRC = path.join(__dirname, '..', 'keystores', 'debug.keystore');
const DEST = path.join(os.homedir(), '.android', 'debug.keystore');

if (!fs.existsSync(SRC)) {
  console.error('[keystore] Falta', SRC);
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
if (fs.existsSync(DEST)) {
  fs.copyFileSync(DEST, `${DEST}.backup.${Date.now()}`);
}
fs.copyFileSync(SRC, DEST);
console.log('[keystore] Instalado en', DEST);
console.log('[keystore] SHA-1:', TEAM_SHA1);
