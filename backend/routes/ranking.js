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

// GET /ranking/friends -> Devuelve el ranking de los amigos de un usuario
router.get('/friends', async (req, res) => {
  const { usuari_id } = req.query;

  if (!usuari_id) {
    return res.status(400).json({ error: 'usuari_id es requerido' });
  }

  try {
    const query = `
      SELECT u.id, u.username, c.punts 
      FROM ego.conductor c
      JOIN ego.usuari u ON c.user_id = u.id
      WHERE u.id IN (
        SELECT CASE
          WHEN a.usuari_id1 = $1 THEN a.usuari_id2
          ELSE a.usuari_id1
        END AS friend_id
        FROM ego.amics a
        WHERE (a.usuari_id1 = $1 OR a.usuari_id2 = $1)
        AND a.per_acceptar IS NULL
      ) OR u.id = $1
      ORDER BY c.punts DESC
      LIMIT 50;
    `;
    const result = await pool.query(query, [usuari_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo el ranking de amigos:', error);
    res.status(500).json({ error: 'Error interno del servidor al cargar el ranking de amigos' });
  }
});

module.exports = router;