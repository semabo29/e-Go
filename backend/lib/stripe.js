// Stripe pero modo test pq el normal no podemos pq hay q solicitar cosas y eso
const Stripe = require('stripe');

let client = null;
let clientKeyFingerprint = '';

function stripeSecretKey() {
  return String(process.env.STRIPE_SECRET_KEY || '').trim();
}

function stripePriceIdMonthly() {
  return String(process.env.STRIPE_PRICE_ID_MONTHLY || '').trim();
}

/** Nombres de variables que faltan o están vacías (solo diagnóstico, sin valores). */
function getStripeEnvMissing() {
  const missing = [];
  if (!stripeSecretKey()) missing.push('STRIPE_SECRET_KEY');
  if (!stripePriceIdMonthly()) missing.push('STRIPE_PRICE_ID_MONTHLY');
  return missing;
}

function getStripe() {
  const key = stripeSecretKey();
  if (!key) return null;
  if (!client || clientKeyFingerprint !== key) {
    client = new Stripe(key);
    clientKeyFingerprint = key;
  }
  return client;
}

function isStripeConfigured() {
  return getStripeEnvMissing().length === 0;
}

module.exports = { getStripe, isStripeConfigured, getStripeEnvMissing, stripePriceIdMonthly };
