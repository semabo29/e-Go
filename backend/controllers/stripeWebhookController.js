const { getStripe } = require('../lib/stripe');
const subscriptionModel = require('../models/subscriptionModel');

function mapStripeStatus(stripeSub) {
  return {
    stripe_customer_id: stripeSub.customer,
    stripe_subscription_id: stripeSub.id,
    status: stripeSub.status,
    current_period_end: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null,
    cancel_at_period_end: Boolean(stripeSub.cancel_at_period_end),
  };
}

async function syncSubscriptionFromStripe(stripe, stripeSubId) {
  const sub = await stripe.subscriptions.retrieve(stripeSubId);
  let usuariId = sub.metadata?.usuari_id ? parseInt(sub.metadata.usuari_id, 10) : null;
  if (!usuariId) {
    const row = await subscriptionModel.findByStripeSubscriptionId(sub.id);
    usuariId = row ? row.usuari_id : null;
  }

  if (!usuariId) {
    console.warn('[stripe webhook] No usuari_id para subscription', sub.id);
    return;
  }

  await subscriptionModel.upsertFromStripe(usuariId, mapStripeStatus(sub));
}

/**
 * POST /subscription/webhook
 * Cuerpo RAW (express.raw). Configurar STRIPE_WEBHOOK_SECRET.
 */
async function handleWebhook(req, res) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error('[stripe webhook] Falta STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Webhook no configurado' });
  }

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] Firma inválida:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;
        const userId = session.client_reference_id
          ? parseInt(session.client_reference_id, 10)
          : null;
        const subId = session.subscription;
        if (!userId || !subId) {
          console.warn('[stripe webhook] checkout.session.completed sin user o subscription');
          break;
        }
        const sub = await stripe.subscriptions.retrieve(subId);
        await subscriptionModel.upsertFromStripe(userId, mapStripeStatus(sub));
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await syncSubscriptionFromStripe(stripe, sub.id);
        break;
      }
      case 'invoice.paid': {
        // Renovación mensual: el estado sigue en subscription.updated; opcional refrescar
        const invoice = event.data.object;
        if (invoice.subscription) {
          await syncSubscriptionFromStripe(stripe, invoice.subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] Error procesando evento:', event.type, err);
    return res.status(500).json({ error: 'Error interno' });
  }

  return res.json({ received: true });
}

module.exports = { handleWebhook };
