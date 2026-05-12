const path = require('path');
// Cargamos variables de entorno (Prioriza las de AWS Lambda)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const companyRoutes = require('./routes/company');
const stationRoutes = require('./routes/stations');
const favoriteRoutes = require('./routes/favorits'); // Importamos la ruta de favoritos
const vehicleRoutes = require('./routes/vehicles');//Importamos la ruta de vehiculos
const subscriptionRoutes = require('./routes/subscription');
const chargingRoutes = require('./routes/charging'); // Importamos la ruta de carga
const rankingRoutes = require('./routes/ranking');
const userRoutes = require('./routes/users');
const incidenciaRoutes = require('./routes/incidencias');
const { handleWebhook } = require('./controllers/stripeWebhookController');
const { canReach } = require('./services/rangeCalculationService');

const { pool } = require('./lib/db');
const { startScheduler } = require('./lib/scheduler'); // Importamos el planificador

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
// Stripe: firma HMAC sobre el cuerpo en bruto (debe ir antes de express.json)
app.post(
  '/subscription/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);
app.use(express.json());

// API Gateway u otros proxies con prefijo de etapa (/prod, /dev): quitarlo para que coincidan las rutas.
// En Lambda, define API_PATH_PREFIX=/prod (o el valor que use tu despliegue).
const apiPathPrefix = (process.env.API_PATH_PREFIX || '').trim();
if (apiPathPrefix) {
  const prefix = apiPathPrefix.startsWith('/') ? apiPathPrefix : `/${apiPathPrefix}`;
  app.use((req, res, next) => {
    const url = req.url || '';
    const q = url.indexOf('?');
    const pathPart = q === -1 ? url : url.slice(0, q);
    const query = q === -1 ? '' : url.slice(q);
    if (pathPart === prefix || pathPart.startsWith(`${prefix}/`)) {
      const rest = pathPart.slice(prefix.length) || '/';
      req.url = rest + query;
    }
    next();
  });
}

const authController = require('./controllers/authController');
// Login local admin/empresa: rutas explícitas en la app principal (antes del mount /auth).
// Así se evitan 404 en despliegues donde el sub-router no recibe bien la ruta.
app.post('/auth/admin/local/login', authController.adminLocalLogin);
app.post('/auth/company/local/login', authController.companyLocalLogin);

// --- RUTAS ---
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/company', companyRoutes);
app.use('/stations', stationRoutes);
// Cualquier petición que empiece con la URL /favorites debe ser gestionada por las reglas de favoriteRoutes
app.use('/favorites', favoriteRoutes);
app.use('/car', vehicleRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/charging', chargingRoutes); // Rutas para sesiones de carga y puntos
app.use('/ranking', rankingRoutes);
app.use('/user', userRoutes);
app.use('/incidencias', incidenciaRoutes);

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
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en 0.0.0.0:${PORT} (accesible desde LAN y adb reverse)`);
    // Iniciamos la actualización automática de estaciones cada 5 minutos
    startScheduler(5 * 60 * 1000); 
  });
}
