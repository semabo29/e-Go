const { pool } = require('../lib/db'); // Ajusta la ruta a la teva connexió

const reviewsController = {
    // 1. OBTENIR LES RESSENYES D'UNA ESTACIÓ
    getReviewsByStation: async (req, res) => {
        const { stationId } = req.params;
        // Obtenim l'id de l'usuari si ens l'envien (per saber si els cors han d'estar vermells)
        const userId = req.query.userId || 0;

        try {
            const query = `
                SELECT
                  r.id,
                  r.puntuacio,
                  r.comentari,
                  r.data_publicacio,
                  r.data_actualitzacio,
                  r.usuari_id,
                  u.username,
                  COALESCE(l.likes_count, 0) AS likes_count,
                  EXISTS(
                    SELECT 1 FROM ego.resenyes_likes rl2
                    WHERE rl2.resenya_id = r.id AND rl2.usuari_id = $2
                  ) AS user_has_liked
                FROM ego.resenyes r
                JOIN ego.usuari u ON r.usuari_id = u.id
                LEFT JOIN (
                    SELECT resenya_id, COUNT(*) AS likes_count
                    FROM ego.resenyes_likes
                    GROUP BY resenya_id
                ) l ON l.resenya_id = r.id
                WHERE r.estacio_id = $1
                ORDER BY r.data_publicacio DESC;
            `;
            const { rows } = await pool.query(query, [stationId, userId]);

            // PostgreSQL retorna COUNT com a string, ho passem a número
            const formattedRows = rows.map(r => ({
                ...r,
                likes_count: parseInt(r.likes_count, 10)
            }));

            res.json(formattedRows);
        } catch (error) {
            console.error('Error obtenint ressenyes:', error);
            res.status(500).json({ error: 'Error intern del servidor' });
        }
    },

    // 2. CREAR UNA NOVA RESSENYA
    createReview: async (req, res) => {
        const { stationId } = req.params;
        const { puntuacio, comentari } = req.body;

        // ATENCIÓ: Obté el userId del token d'autenticació (req.user.id)
        const userId = req.user ? req.user.id : req.body.userId;

        if (!puntuacio || puntuacio < 1 || puntuacio > 5) {
            return res.status(400).json({ error: 'La puntuació ha de ser entre 1 i 5' });
        }

        try {
            const query = `
                INSERT INTO ego.resenyes (usuari_id, estacio_id, puntuacio, comentari)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const { rows } = await pool.query(query, [userId, stationId, puntuacio, comentari]);
            res.status(201).json(rows[0]);
        } catch (error) {
            console.error('Error creant ressenya:', error);
            res.status(500).json({ error: 'Error intern del servidor' });
        }
    },

    // 3. EDITAR UNA RESSENYA PRÒPIA
    editReview: async (req, res) => {
        const { reviewId } = req.params;
        const { puntuacio, comentari } = req.body;

        const userId = req.user ? req.user.id : req.body.userId;

        if (!puntuacio || puntuacio < 1 || puntuacio > 5) {
            return res.status(400).json({ error: 'La puntuació ha de ser entre 1 i 5' });
        }

        try {
            // S'assegura que només el propietari de la ressenya la pugui editar (usuari_id = $4)
            const query = `
                UPDATE ego.resenyes 
                SET puntuacio = $1, comentari = $2
                WHERE id = $3 AND usuari_id = $4
                RETURNING *;
            `;
            const { rows, rowCount } = await pool.query(query, [puntuacio, comentari, reviewId, userId]);

            if (rowCount === 0) {
                return res.status(404).json({
                    error: 'Ressenya no trobada o no tens permisos per editar-la.'
                });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('Error editant ressenya:', error);
            res.status(500).json({ error: 'Error intern del servidor' });
        }
    },

    // 4. ESBORRAR UNA RESSENYA PRÒPIA
    deleteReview: async (req, res) => {
        const { reviewId } = req.params;

        const userId = req.user ? req.user.id : req.body.userId;

        try {
            const query = `
                DELETE FROM ego.resenyes 
                WHERE id = $1 AND usuari_id = $2
                RETURNING id;
            `;
            const { rowCount } = await pool.query(query, [reviewId, userId]);

            if (rowCount === 0) {
                return res.status(404).json({
                    error: 'Ressenya no trobada o no tens permisos per esborrar-la.'
                });
            }

            res.json({ message: 'Ressenya esborrada correctament' });
        } catch (error) {
            console.error('Error esborrant ressenya:', error);
            res.status(500).json({ error: 'Error intern del servidor' });
        }
    },

    //FUNCIÓ PER DONAR O TREURE LIKE
    toggleLike: async (req, res) => {
        const { reviewId } = req.params;
        const userId = req.user.id; // Usuari assegurat pel requireAuth

        try {
            // Comprovem si ja ha donat like anteriorment
            const checkQuery = `SELECT 1 FROM ego.resenyes_likes WHERE resenya_id = $1 AND usuari_id = $2`;
            const { rowCount } = await pool.query(checkQuery, [reviewId, userId]);

            if (rowCount > 0) {
                // Si ja existia el like, l'esborrem (Unlike)
                await pool.query(`DELETE FROM ego.resenyes_likes WHERE resenya_id = $1 AND usuari_id = $2`, [reviewId, userId]);
                res.json({ liked: false });
            } else {
                // Si no existia, el creem (Like)
                await pool.query(`INSERT INTO ego.resenyes_likes (resenya_id, usuari_id) VALUES ($1, $2)`, [reviewId, userId]);
                res.json({ liked: true });
            }
        } catch (error) {
            console.error('Error fent toggle like:', error);
            res.status(500).json({ error: 'Error intern del servidor' });
        }
    }
};

module.exports = reviewsController;