const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/** Keystore del equipo (mismo que frontend/keystores/debug.keystore en main). */
const KEYSTORE = path.join(__dirname, 'keystores', 'debug.keystore');
const TEAM_SHA1 = '48:5D:FB:2C:91:EB:8C:35:4D:0E:53:8D:46:EF:F0:50:96:CC:AC:49';

try {
  const rs = cp.execSync(
    `keytool -exportcert -rfc -keystore "${KEYSTORE}" -alias androiddebugkey -storepass android`,
    { encoding: 'utf8' }
  );
  if (rs.includes('-----BEGIN CERTIFICATE-----')) {
    const b64 = rs.split('-----BEGIN CERTIFICATE-----')[1].split('-----END CERTIFICATE-----')[0].replace(/\s+/g, '');
    const der = Buffer.from(b64, 'base64');
    const sha1 = crypto.createHash('sha1').update(der).digest('hex').toUpperCase().match(/.{1,2}/g).join(':');
    fs.writeFileSync(path.join(__dirname, 'sha1.txt'), sha1, 'utf8');
    if (sha1 !== TEAM_SHA1) {
      console.error('SHA-1 inesperada:', sha1, '(esperada', TEAM_SHA1 + ')');
      process.exit(1);
    }
    console.log('SHA-1 del keystore del equipo:', sha1);
  }
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
