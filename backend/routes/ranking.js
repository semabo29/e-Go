const express = require('express');
const router = express.Router();
const { pool } = require('../lib/db');

// GET /ranking -> Devuelve el top 50 de conductores con más puntos
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, c.punts 
      FROM ego.conductor c
      JOIN ego.usuari u ON c.user_id = u.id
      ORDER BY c.punts DESC
      LIMIT 50;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo el ranking:', error);
    res.status(500).json({ error: 'Error interno del servidor al cargar el ranking' });
  }
});

module.exports = router;