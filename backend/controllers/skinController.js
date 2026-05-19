const { pool } = require('../lib/db'); // Ajusta la ruta a tu archivo de DB

// 1. Obtener todas las skins de la tienda
const getAllSkins = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ego.skins ORDER BY preu_punts ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching skins:', error);
    res.status(500).json({ error: 'Error obtenint les skins' });
  }
};

// 2. Obtener el inventario de un conductor específico y sus puntos reales
const getUserSkins = async (req, res) => {
  const { id } = req.params; // ID del conductor
  try {
    // a. Obtener las skins que ya tiene
    const skinsResult = await pool.query(`
      SELECT s.id, s.nom, s.descripcio, s.arxiu_asset, cs.equipada, cs.data_obtencio
      FROM ego.skins s
      JOIN ego.conductor_skins cs ON s.id = cs.skin_id
      WHERE cs.conductor_id = $1
    `, [id]);
    
    // b. Obtener sus puntos actuales
    const pointsResult = await pool.query('SELECT punts FROM ego.conductor WHERE user_id = $1', [id]);
    const puntsReals = pointsResult.rowCount > 0 ? pointsResult.rows[0].punts : 0;

    // c. Enviamos ambas cosas juntas al móvil
    res.json({
      inventari: skinsResult.rows,
      punts: puntsReals
    });
  } catch (error) {
    console.error('Error fetching user skins:', error);
    res.status(500).json({ error: 'Error obtenint l\'inventari del conductor' });
  }
};

// 3. Comprar una skin
const buySkin = async (req, res) => {
  const { id } = req.params; // ID del conductor
  const { skin_id } = req.body;

  try {
    // a. Obtener precio de la skin
    const skinRes = await pool.query('SELECT preu_punts FROM ego.skins WHERE id = $1', [skin_id]);
    if (skinRes.rowCount === 0) return res.status(404).json({ error: 'Skin no trobada' });
    const precio = skinRes.rows[0].preu_punts;

    // b. Obtener puntos del conductor
    const userRes = await pool.query('SELECT punts FROM ego.conductor WHERE user_id = $1', [id]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'Conductor no trobat' });
    let misPuntos = userRes.rows[0].punts || 0;

    // c. Comprobar saldo
    if (misPuntos < precio) {
      return res.status(400).json({ error: 'No tens punts suficients' });
    }

    // d. Transacción: Restar puntos y otorgar skin
    await pool.query('BEGIN');
    
    // Restamos los puntos
    await pool.query('UPDATE ego.conductor SET punts = punts - $1 WHERE user_id = $2', [precio, id]);
    
    // Añadimos a la tabla conductor_skins (data_obtencio debería rellenarse sola si le pusiste DEFAULT CURRENT_TIMESTAMP)
    await pool.query(
        'INSERT INTO ego.conductor_skins (conductor_id, skin_id, equipada, data_obtencio) VALUES ($1, $2, FALSE, NOW())', 
        [id, skin_id]
    );
    
    await pool.query('COMMIT');

    res.json({ message: 'Skin comprada amb èxit', punts_restants: misPuntos - precio });
  } catch (error) {
    await pool.query('ROLLBACK');
    // Error 23505 es violación de Unique/Primary Key en Postgres (ya tiene la skin)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ja posseeixes aquesta skin' });
    }
    console.error('Error buying skin:', error);
    res.status(500).json({ error: 'Error al comprar la skin' });
  }
};

// 4. Equipar una skin
const equipSkin = async (req, res) => {
  const { id } = req.params; // ID del conductor
  const { skin_id } = req.body;

  try {
    await pool.query('BEGIN');
    
    // a. Desequipar todas las skins de este conductor
    await pool.query('UPDATE ego.conductor_skins SET equipada = FALSE WHERE conductor_id = $1', [id]);
    
    // b. Equipar la skin seleccionada
    const result = await pool.query(
        'UPDATE ego.conductor_skins SET equipada = TRUE WHERE conductor_id = $1 AND skin_id = $2', 
        [id, skin_id]
    );
    
    // Si no se ha actualizado ninguna fila, significa que el usuario no tiene esa skin
    if (result.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'No posseeixes aquesta skin o no existeix' });
    }

    await pool.query('COMMIT');
    res.json({ message: 'Skin equipada amb èxit' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error equipping skin:', error);
    res.status(500).json({ error: 'Error al equipar la skin' });
  }
};

module.exports = { getAllSkins, getUserSkins, buySkin, equipSkin };