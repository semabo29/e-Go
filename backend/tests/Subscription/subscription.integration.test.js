const request = require('supertest');
const express = require('express');

jest.mock('../../models/subscriptionModel', () => ({
  findByUserId: jest.fn(),
  upsertFromStripe: jest.fn(),
  findByStripeSubscriptionId: jest.fn(),
}));

jest.mock('../../models/userModel', () => ({
  findById: jest.fn(),
}));

jest.mock('../../lib/stripe', () => ({
  isStripeConfigured: jest.fn(),
  getStripe: jest.fn(),
}));

const subscriptionModel = require('../../models/subscriptionModel');
const userModel = require('../../models/userModel');
const stripeLib = require('../../lib/stripe');
const subscriptionRouter = require('../../routes/subscription');
const { handleWebhook } = require('../../controllers/stripeWebhookController');

const app = express();
app.post('/subscription/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());
app.use('/subscription', subscriptionRouter);

describe('Integración Stripe subscription routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  test('POST /subscription/create-checkout-session -> 400 con body inválido', async () => {
    stripeLib.isStripeConfigured.mockReturnValue(true);
    const res = await request(app).post('/subscription/create-checkout-session').send({ userId: '' });
    expect(res.status).toBe(400);
  });

  test('POST /subscription/create-checkout-session -> 200 con session válida', async () => {
    stripeLib.isStripeConfigured.mockReturnValue(true);
    userModel.findById.mockResolvedValue({ id: 1, email: 'user@test.com' });
    stripeLib.getStripe.mockReturnValue({
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'cs_1',
            url: 'https://checkout.stripe.com/cs_1',
          }),
        },
      },
    });

    const res = await request(app).post('/subscription/create-checkout-session').send({
      userId: 1,
      successUrl: 'https://ok',
      cancelUrl: 'https://cancel',
    });

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe('cs_1');
  });

  test('GET /subscription/status -> inactive cuando no hay fila', async () => {
    subscriptionModel.findByUserId.mockResolvedValue(null);
    const res = await request(app).get('/subscription/status?userId=1');
    expect(res.status).toBe(200);
    expect(res.body.isPremium).toBe(false);
  });

  test('POST /subscription/webhook -> procesa checkout.session.completed', async () => {
    const stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              mode: 'subscription',
              client_reference_id: '4',
              subscription: 'sub_4',
            },
          },
        }),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_4',
          customer: 'cus_4',
          status: 'active',
          current_period_end: 1768003200,
          cancel_at_period_end: false,
        }),
      },
    };
    stripeLib.getStripe.mockReturnValue(stripe);
    subscriptionModel.upsertFromStripe.mockResolvedValue({});

    const res = await request(app)
      .post('/subscription/webhook')
      .set('stripe-signature', 'ok')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(subscriptionModel.upsertFromStripe).toHaveBeenCalled();
  });
});
