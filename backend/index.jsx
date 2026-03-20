// Punto de entrada: monta rutas y arranca el servidor. Auth en routes/auth.js, BD en lib/db.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { pool } = require('./lib/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const stationRoutes = require('./routes/stations');
const { startScheduler } = require('./lib/scheduler'); // Importamos el planificador
const favoriteRoutes = require('./routes/favorits');//Importamos la ruta de favoritos

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/stations', stationRoutes);
//Cualquier petición que empiece con la URL /favorites debe ser gestionada por
//las reglas que he definido dentro del archivo favoriteRoutes
app.use('/favorites', favoriteRoutes);

// Comprueba que API y BD responden
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({
      mensaje: 'API de e-Go funcionando',
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    console.error('Error al conectar con PostgreSQL:', err);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

// Iniciamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);

  // Iniciamos la actualización automática de estaciones cada 5 minutos
  startScheduler(5 * 60 * 1000);
});
