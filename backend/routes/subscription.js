const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

router.post('/create-checkout-session', subscriptionController.createCheckoutSession);
router.post('/confirm-checkout-session', subscriptionController.confirmCheckoutSession);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/reactivate', subscriptionController.reactivateSubscription);
router.get('/status', subscriptionController.getStatus);

module.exports = router;
