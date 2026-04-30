const { getStripe, isStripeConfigured } = require('../lib/stripe');
const userModel = require('../models/userModel');
const subscriptionModel = require('../models/subscriptionModel');

/**
 * POST /subscription/create-checkout-session
 * Body: { userId, successUrl, cancelUrl }
 * Devuelve { url } para abrir en WebBrowser (Expo).
 */
async function createCheckoutSession(req, res) {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        error:
          'Stripe no configurado. Añade STRIPE_SECRET_KEY y STRIPE_PRICE_ID_MONTHLY en .env.',
      });
    }

    const { userId, successUrl, cancelUrl } = req.body;
    const uid = Number(userId);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'userId inválido' });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Faltan successUrl o cancelUrl' });
    }

    const user = await userModel.findById(uid);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(uid),
      customer_email: user.email,
      subscription_data: {
        metadata: { usuari_id: String(uid) },
      },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[subscription] createCheckoutSession:', err);
    return res.status(500).json({
      error: 'No se pudo crear la sesión de pago',
      details: err.message,
    });
  }
}

/**
 * GET /subscription/status?userId=
 */
async function getStatus(req, res) {
  try {
    const uid = Number(req.query.userId);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'Falta userId válido' });
    }
    const row = await subscriptionModel.findByUserId(uid);
    if (!row) {
      return res.json({
        status: 'inactive',
        isPremium: false,
        current_period_end: null,
        cancel_at_period_end: false,
      });
    }
    const isPremium = ['active', 'trialing'].includes(row.status);

    return res.json({
      ...row,
      isPremium,
    });
  } catch (err) {
    console.error('[subscription] getStatus:', err);
    return res.status(500).json({ error: 'Error leyendo suscripción' });
  }
}

/**
 * POST /subscription/cancel
 * Body: { userId }
 * Marca cancelación al final del periodo en Stripe.
 */
async function cancelSubscription(req, res) {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        error:
          'Stripe no configurado. Añade STRIPE_SECRET_KEY y STRIPE_PRICE_ID_MONTHLY en .env.',
      });
    }

    const uid = Number(req.body?.userId);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const row = await subscriptionModel.findByUserId(uid);
    if (!row?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No hay suscripción activa para cancelar' });
    }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    const updated = await subscriptionModel.upsertFromStripe(uid, {
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    });

    return res.json({
      ok: true,
      subscription: updated,
      isPremium: ['active', 'trialing'].includes(updated.status),
    });
  } catch (err) {
    console.error('[subscription] cancelSubscription:', err);
    return res.status(500).json({
      error: 'No se pudo cancelar la suscripción',
      details: err.message,
    });
  }
}

/**
 * POST /subscription/reactivate
 * Body: { userId }
 * Revierte cancelación al final del periodo en Stripe.
 */
async function reactivateSubscription(req, res) {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        error:
          'Stripe no configurado. Añade STRIPE_SECRET_KEY y STRIPE_PRICE_ID_MONTHLY en .env.',
      });
    }

    const uid = Number(req.body?.userId);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const row = await subscriptionModel.findByUserId(uid);
    if (!row?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No hay suscripción para reactivar' });
    }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    const updated = await subscriptionModel.upsertFromStripe(uid, {
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    });

    return res.json({
      ok: true,
      subscription: updated,
      isPremium: ['active', 'trialing'].includes(updated.status),
    });
  } catch (err) {
    console.error('[subscription] reactivateSubscription:', err);
    return res.status(500).json({
      error: 'No se pudo reactivar la suscripción',
      details: err.message,
    });
  }
}

/**
 * POST /subscription/confirm-checkout-session
 * Body: { userId, sessionId }
 * Confirma una checkout session y sincroniza estado premium sin depender del webhook.
 */
async function confirmCheckoutSession(req, res) {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        error:
          'Stripe no configurado. Añade STRIPE_SECRET_KEY y STRIPE_PRICE_ID_MONTHLY en .env.',
      });
    }

    const uid = Number(req.body?.userId);
    const sessionId = String(req.body?.sessionId || '');
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'userId inválido' });
    }
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'sessionId inválido' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.client_reference_id && Number(session.client_reference_id) !== uid) {
      return res.status(403).json({ error: 'La sesión no pertenece al usuario indicado' });
    }

    const paymentDone = session.payment_status === 'paid';
    const subscriptionObj =
      session.subscription && typeof session.subscription === 'object'
        ? session.subscription
        : null;

    if (paymentDone && subscriptionObj?.id) {
      const updated = await subscriptionModel.upsertFromStripe(uid, {
        stripe_customer_id: subscriptionObj.customer,
        stripe_subscription_id: subscriptionObj.id,
        status: subscriptionObj.status,
        current_period_end: subscriptionObj.current_period_end
          ? new Date(subscriptionObj.current_period_end * 1000)
          : null,
        cancel_at_period_end: Boolean(subscriptionObj.cancel_at_period_end),
      });

      return res.json({
        confirmed: true,
        pending: false,
        subscription: updated,
        isPremium: ['active', 'trialing'].includes(updated.status),
      });
    }

    return res.json({
      confirmed: false,
      pending: true,
      payment_status: session.payment_status || null,
    });
  } catch (err) {
    console.error('[subscription] confirmCheckoutSession:', err);
    return res.status(500).json({
      error: 'No se pudo confirmar la sesión de pago',
      details: err.message,
    });
  }
}

module.exports = {
  createCheckoutSession,
  getStatus,
  cancelSubscription,
  reactivateSubscription,
  confirmCheckoutSession,
};
