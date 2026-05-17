const { getStripe } = require('../lib/stripe');
const subscriptionModel = require('../models/subscriptionModel');

function mapStripeSubscriptionToRow(sub) {
  return {
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
}

/**
 * Programa cancelación al final del periodo en Stripe (`cancel_at_period_end: true`).
 * Misma lógica para POST /subscription/cancel y para baneo admin.
 *
 * @param {number} usuariId
 * @returns {Promise<{ ok: boolean, reason: string, subscription?: object, error?: string }>}
 */
async function scheduleSubscriptionCancelAtPeriodEnd(usuariId) {
  const stripe = getStripe();
  if (!stripe) {
    console.warn(
      '[stripe] STRIPE_SECRET_KEY ausente: no se puede programar cancel_at_period_end para usuari',
      usuariId
    );
    return { ok: false, reason: 'stripe_unconfigured' };
  }

  const row = await subscriptionModel.findByUserId(usuariId);
  if (!row?.stripe_subscription_id) {
    return { ok: false, reason: 'no_stripe_subscription' };
  }

  try {
    const existing = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    if (existing.status === 'canceled') {
      const updated = await subscriptionModel.upsertFromStripe(usuariId, mapStripeSubscriptionToRow(existing));
      return { ok: true, reason: 'already_canceled', subscription: updated };
    }

    if (existing.cancel_at_period_end === true) {
      const updated = await subscriptionModel.upsertFromStripe(usuariId, mapStripeSubscriptionToRow(existing));
      return { ok: true, reason: 'already_cancel_at_period_end', subscription: updated };
    }

    const sub = await stripe.subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    const updated = await subscriptionModel.upsertFromStripe(usuariId, mapStripeSubscriptionToRow(sub));
    return { ok: true, reason: 'cancel_at_period_end_set', subscription: updated };
  } catch (err) {
    console.error('[stripe] scheduleSubscriptionCancelAtPeriodEnd usuari', usuariId, err.message);
    return { ok: false, reason: 'stripe_error', error: err.message };
  }
}

module.exports = { scheduleSubscriptionCancelAtPeriodEnd };
