/**
 * Copia keystores/debug.keystore (SHA-1 del equipo en Google Cloud) a:
 * - ~/.android/debug.keystore
 * - android/app/debug.keystore (Gradle usa este archivo en expo run:android)
 *
 * Ejecutar DESPUÉS de `expo prebuild`, no antes (prebuild regenera debug.keystore por defecto).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const TEAM_SHA1 = '48:5D:FB:2C:91:EB:8C:35:4D:0E:53:8D:46:EF:F0:50:96:CC:AC:49';
const SRC = path.join(__dirname, '..', 'keystores', 'debug.keystore');
const DEST_HOME = path.join(os.homedir(), '.android', 'debug.keystore');
const DEST_ANDROID = path.join(__dirname, '..', 'android', 'app', 'debug.keystore');

function backupIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, `${filePath}.backup.${Date.now()}`);
  }
}

function readSha1(keystorePath) {
  const out = execSync(
    `keytool -list -v -keystore "${keystorePath}" -alias androiddebugkey -storepass android`,
    { encoding: 'utf8' }
  );
  const match = out.match(/SHA1:\s*([0-9A-F:]+)/i);
  return match ? match[1].toUpperCase() : null;
}

if (!fs.existsSync(SRC)) {
  console.error('[keystore] Falta', SRC);
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST_HOME), { recursive: true });
backupIfExists(DEST_HOME);
fs.copyFileSync(SRC, DEST_HOME);
console.log('[keystore] Instalado en', DEST_HOME);

if (fs.existsSync(path.join(__dirname, '..', 'android', 'app'))) {
  backupIfExists(DEST_ANDROID);
  fs.copyFileSync(SRC, DEST_ANDROID);
  const sha = readSha1(DEST_ANDROID);
  console.log('[keystore] Instalado en', DEST_ANDROID);
  if (sha && sha !== TEAM_SHA1) {
    console.error('[keystore] SHA-1 inesperada en android/app:', sha);
    process.exit(1);
  }
} else {
  console.log('[keystore] Sin carpeta android/app; tras prebuild vuelve a ejecutar este script.');
}

console.log('[keystore] SHA-1 esperada (Google Cloud):', TEAM_SHA1);
