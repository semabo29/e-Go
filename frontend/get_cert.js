const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
try {
  const rs = cp.execSync('keytool -exportcert -rfc -keystore "C:\\Users\\Pau\\.android\\debug.keystore" -alias androiddebugkey -storepass android', { encoding: 'utf8' });
  if (rs.includes('-----BEGIN CERTIFICATE-----')) {
    const b64 = rs.split('-----BEGIN CERTIFICATE-----')[1].split('-----END CERTIFICATE-----')[0].replace(/\s+/g, '');
    const der = Buffer.from(b64, 'base64');
    const sha1 = crypto.createHash('sha1').update(der).digest('hex').toUpperCase().match(/.{1,2}/g).join(':');
    fs.writeFileSync('sha1.txt', sha1, 'utf8');
  }
} catch(e) {}
