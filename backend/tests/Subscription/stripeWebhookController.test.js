const subscriptionModel = require('../../models/subscriptionModel');
const stripeLib = require('../../lib/stripe');
const { handleWebhook } = require('../../controllers/stripeWebhookController');

jest.mock('../../models/subscriptionModel');
jest.mock('../../lib/stripe');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('stripeWebhookController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  test('devuelve 400 cuando la firma es inválida', async () => {
    const stripe = {
      webhooks: {
        constructEvent: jest.fn(() => {
          throw new Error('invalid signature');
        }),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);

    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'bad' } };
    const res = mockRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/Webhook Error/i));
  });

  test('devuelve 500 cuando falta configuración de webhook', async () => {
    stripeLib.getStripe.mockReturnValue(null);
    process.env.STRIPE_WEBHOOK_SECRET = '';
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Webhook no configurado' }));
  });

  test('procesa checkout.session.completed y guarda suscripción', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          client_reference_id: '9',
          subscription: 'sub_123',
        },
      },
    };
    const stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          current_period_end: 1735689600,
          cancel_at_period_end: false,
        }),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    subscriptionModel.upsertFromStripe.mockResolvedValue({});

    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);

    expect(subscriptionModel.upsertFromStripe).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        stripe_subscription_id: 'sub_123',
        status: 'active',
      })
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('ignora checkout.session.completed cuando no es modo subscription', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: { object: { mode: 'payment' } },
    };
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(event) },
      subscriptions: { retrieve: jest.fn() },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(subscriptionModel.upsertFromStripe).not.toHaveBeenCalled();
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('procesa invoice.paid (renovación) y refresca estado de suscripción', async () => {
    const event = {
      type: 'invoice.paid',
      data: {
        object: {
          subscription: 'sub_renew_1',
        },
      },
    };

    const stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_renew_1',
          customer: 'cus_renew_1',
          status: 'active',
          current_period_end: 1767225600,
          cancel_at_period_end: false,
          metadata: {},
        }),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    subscriptionModel.findByStripeSubscriptionId.mockResolvedValue({ usuari_id: 12 });
    subscriptionModel.upsertFromStripe.mockResolvedValue({});

    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_renew_1');
    expect(subscriptionModel.upsertFromStripe).toHaveBeenCalledWith(
      12,
      expect.objectContaining({
        stripe_subscription_id: 'sub_renew_1',
        status: 'active',
      })
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('procesa customer.subscription.updated usando metadata usuari_id', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_upd_1',
        },
      },
    };

    const stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_upd_1',
          customer: 'cus_upd_1',
          status: 'trialing',
          current_period_end: 1768003200,
          cancel_at_period_end: false,
          metadata: { usuari_id: '44' },
        }),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    subscriptionModel.upsertFromStripe.mockResolvedValue({});

    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);

    expect(subscriptionModel.upsertFromStripe).toHaveBeenCalledWith(
      44,
      expect.objectContaining({
        stripe_subscription_id: 'sub_upd_1',
        status: 'trialing',
      })
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('checkout.session.completed sin userId o subscription: no upsert', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          client_reference_id: '',
          subscription: null,
        },
      },
    };
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(event) },
      subscriptions: { retrieve: jest.fn() },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(subscriptionModel.upsertFromStripe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('customer.subscription.updated sin usuari_id ni fila en BD: no upsert', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_orphan' } },
    };
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(event) },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_orphan',
          customer: 'cus_x',
          status: 'canceled',
          metadata: {},
          cancel_at_period_end: false,
        }),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    subscriptionModel.findByStripeSubscriptionId.mockResolvedValue(null);
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);
    expect(subscriptionModel.upsertFromStripe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('invoice.paid sin subscription en factura: no retrieve', async () => {
    const event = {
      type: 'invoice.paid',
      data: { object: { subscription: null } },
    };
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(event) },
      subscriptions: { retrieve: jest.fn() },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('checkout.session.completed guarda sub sin current_period_end en Stripe', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          client_reference_id: '3',
          subscription: 'sub_nop',
        },
      },
    };
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(event) },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_nop',
          customer: 'cus_nop',
          status: 'active',
          current_period_end: null,
          cancel_at_period_end: false,
        }),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    subscriptionModel.upsertFromStripe.mockResolvedValue({});
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);
    expect(subscriptionModel.upsertFromStripe).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        current_period_end: null,
        stripe_subscription_id: 'sub_nop',
      })
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('evento desconocido se ignora sin error', async () => {
    const event = { type: 'charge.succeeded', data: { object: {} } };
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(event) },
      subscriptions: { retrieve: jest.fn() },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();
    await handleWebhook(req, res);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('retorna 500 si falla procesamiento interno del evento', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: { id: 'sub_broken' },
      },
    };
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(event) },
      subscriptions: {
        retrieve: jest.fn().mockRejectedValue(new Error('stripe internal fail')),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    const req = { body: Buffer.from('{}'), headers: { 'stripe-signature': 'ok' } };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error interno' }));
  });
});
