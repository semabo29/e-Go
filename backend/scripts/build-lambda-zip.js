/**
 * Genera lambda_deploy.zip con lo necesario para AWS Lambda.
 * Usa rutas relativas (path.join) para que funcione en Linux.
 * Ejecutar desde backend: node scripts/build-lambda-zip.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendRoot = path.join(__dirname, '..');
const stagingDir = path.join(backendRoot, '.lambda-build');
const zipPath = path.join(backendRoot, 'lambda_deploy.zip');

const DIRS_TO_COPY = ['lib', 'routes', 'controllers', 'models', 'services'];
const FILES = ['package.json'];

function rmDirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) rmDirRecursive(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

try {
  if (fs.existsSync(stagingDir)) rmDirRecursive(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  // index.js (entrada Lambda): copiar index.jsx como index.js
  const indexSrc = path.join(backendRoot, 'index.jsx');
  if (fs.existsSync(indexSrc)) {
    fs.copyFileSync(indexSrc, path.join(stagingDir, 'index.js'));
  } else {
    const indexJs = path.join(backendRoot, 'index.js');
    if (fs.existsSync(indexJs)) fs.copyFileSync(indexJs, path.join(stagingDir, 'index.js'));
    else throw new Error('No se encuentra index.jsx ni index.js');
  }

  for (const f of FILES) {
    const src = path.join(backendRoot, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(stagingDir, f));
  }
  const lockFile = path.join(backendRoot, 'package-lock.json');
  if (fs.existsSync(lockFile)) fs.copyFileSync(lockFile, path.join(stagingDir, 'package-lock.json'));

  const envSrc = path.join(backendRoot, '.env');
  if (fs.existsSync(envSrc)) fs.copyFileSync(envSrc, path.join(stagingDir, '.env'));

  for (const dir of DIRS_TO_COPY) {
    const src = path.join(backendRoot, dir);
    if (fs.existsSync(src)) copyRecursive(src, path.join(stagingDir, dir));
  }

  // node_modules solo producción (evita Jest, nodemon, etc.)
  console.log('Instalando dependencias de producción en staging...');
  const hasLock = fs.existsSync(path.join(stagingDir, 'package-lock.json'));
  execSync(hasLock ? 'npm ci --omit=dev' : 'npm install --omit=dev', { cwd: stagingDir, stdio: 'inherit', shell: true });

  // Crear zip con archiver (devDependency)
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  const archiver = require('archiver');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => {
    console.log('Zip creado:', zipPath, '(' + (archive.pointer() / 1024 / 1024).toFixed(2), 'MB)');
    rmDirRecursive(stagingDir);
  });
  archive.pipe(output);
  archive.directory(stagingDir, false);
  archive.finalize();
} catch (err) {
  if (fs.existsSync(stagingDir)) rmDirRecursive(stagingDir);
  console.error(err);
  process.exit(1);
}
