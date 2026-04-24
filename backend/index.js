const path = require('path');
// Cargamos variables de entorno (Prioriza las de AWS Lambda)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const stationRoutes = require('./routes/stations');
const favoriteRoutes = require('./routes/favorits'); // Importamos la ruta de favoritos
const { canReach } = require('./services/rangeCalculationService');

const { pool } = require('./lib/db');
const { startScheduler } = require('./lib/scheduler'); // Importamos el planificador

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- RUTAS ---
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/stations', stationRoutes);
// Cualquier petición que empiece con la URL /favorites debe ser gestionada por las reglas de favoriteRoutes
app.use('/favorites', favoriteRoutes);

// Can Reach endpoint (range calculation)
app.get('/can-reach', async (req, res) => {
  try {
    const { startLat, startLon, endLat, endLon, vehicleType, batteryKWh } = req.query;
    const result = await canReach({
      start: { lat: Number(startLat), lon: Number(startLon) },
      end: { lat: Number(endLat), lon: Number(endLon) },
      vehicleType: String(vehicleType || '').toLowerCase(),
      batteryKWh: Number(batteryKWh),
    });
    res.json(result);
  } catch (error) {
    if (error?.type === 'VALIDATION_ERROR') return res.status(400).json({ error: error.message });
    if (error?.type === 'ROUTE_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error?.type === 'OVER_QUERY_LIMIT') return res.status(429).json({ error: error.message });
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// 1. Root / Health Check
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'online',
      mensaje: 'e-Go API v1.0 - AWS Lambda',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({ status: 'error', details: 'DB Connection failed' });
  }
});

// 2. Manejador 404
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `La ruta ${req.path} no existe en esta API.`
  });
});

// --- EXPORTS ---
// Exportamos la app para que los tests (Jest/Supertest) funcionen correctamente
module.exports = app;
// Exportamos el handler para AWS Lambda
module.exports.handler = serverless(app);

// --- ARRANQUE LOCAL ---
// Solo iniciamos el servidor local si NO estamos en AWS Lambda Y NO estamos en entorno de tests
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
    // Iniciamos la actualización automática de estaciones cada 5 minutos
    startScheduler(5 * 60 * 1000); 
  });
}