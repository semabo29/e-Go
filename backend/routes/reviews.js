const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const { requireAuth } = require('../middleware/requireAuth');

// Obtenir ressenyes (Tothom les pot veure, no cal login)
router.get('/stations/:stationId/reviews', reviewsController.getReviewsByStation);

// Crear, editar i esborrar ressenyes (Només usuaris loguejats)
router.post('/stations/:stationId/reviews', requireAuth, reviewsController.createReview);
router.put('/reviews/:reviewId', requireAuth, reviewsController.editReview);
router.delete('/reviews/:reviewId', requireAuth, reviewsController.deleteReview);

// Endpoint per donar/treure like
router.post('/reviews/:reviewId/like', requireAuth, reviewsController.toggleLike);

module.exports = router;