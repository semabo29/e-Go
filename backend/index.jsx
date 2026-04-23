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
const vehicleRoutes = require('./routes/vehicles');//Importamos la ruta de vehiculos
const subscriptionRoutes = require('./routes/subscription');
const { handleWebhook } = require('./controllers/stripeWebhookController');

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

// --- RUTAS ---
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/stations', stationRoutes);
// Cualquier petición que empiece con la URL /favorites debe ser gestionada por las reglas de favoriteRoutes
app.use('/favorites', favoriteRoutes);
app.use('/car', vehicleRoutes);
app.use('/subscription', subscriptionRoutes);

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