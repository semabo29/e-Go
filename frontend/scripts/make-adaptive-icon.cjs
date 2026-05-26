const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'app', '_assets', 'favicon.png');
const DST = path.join(__dirname, '..', 'app', '_assets', 'adaptive-icon.png');

(async () => {
  const logo = await sharp(SRC)
    .resize(600, 600, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(DST);

  console.log('adaptive-icon.png created at', DST);
})();
