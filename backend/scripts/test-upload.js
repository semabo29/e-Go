/**
 * Prueba rápida de POST /upload-test (multer + S3).
 * Ejecutar desde backend: node scripts/test-upload.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prueba.txt');
const url = 'http://localhost:3000/upload-test';

// Asegurar que existe un archivo de prueba
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, 'Prueba de e-Go\n', 'utf8');
}

const formData = new FormData();
const blob = new Blob([fs.readFileSync(filePath)]);
formData.append('file', blob, 'prueba.txt');

// Node 18+ tiene fetch; FormData con file desde buffer requiere otro enfoque
async function test() {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { filename: 'prueba.txt' });

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

test().catch((err) => {
  console.error('Error:', err.message);
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('¿Está el backend corriendo? (npx nodemon index.jsx)');
  }
  process.exit(1);
});
