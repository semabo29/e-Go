const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Configuración del cliente
// En Lambda, AWS detecta las credenciales automáticamente si el Rol tiene permisos.
const s3Client = new S3Client({ region: 'eu-north-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Sube un archivo a S3
 */
async function uploadFile(fileBuffer, fileName, mimeType) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: `uploads/${Date.now()}-${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  await s3Client.send(new PutObjectCommand(params));
  return params.Key; // Devolvemos la "llave" para guardarla en la DB
}

/**
 * Genera una URL pública para ver el archivo
 */
function getPublicUrl(key) {
  return `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${key}`;
}

module.exports = { uploadFile, getPublicUrl };
