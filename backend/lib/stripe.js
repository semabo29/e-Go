// Stripe pero modo test pq el normal no podemos pq hay q solicitar cosas y eso
const Stripe = require('stripe');

let client = null;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_MONTHLY);
}

module.exports = { getStripe, isStripeConfigured };
