const subscriptionModel = require('../../models/subscriptionModel');
const userModel = require('../../models/userModel');
const stripeLib = require('../../lib/stripe');
const controller = require('../../controllers/subscriptionController');

jest.mock('../../models/subscriptionModel');
jest.mock('../../models/userModel');
jest.mock('../../lib/stripe');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('subscriptionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    test('devuelve inactive cuando no hay fila', async () => {
      subscriptionModel.findByUserId.mockResolvedValue(null);
      const req = { query: { userId: '7' } };
      const res = mockRes();

      await controller.getStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'inactive',
        isPremium: false,
        current_period_end: null,
        cancel_at_period_end: false,
      });
    });

    test('marca premium para status active/trialing', async () => {
      subscriptionModel.findByUserId.mockResolvedValue({
        status: 'active',
        current_period_end: null,
        cancel_at_period_end: false,
      });
      const req = { query: { userId: '8' } };
      const res = mockRes();

      await controller.getStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          isPremium: true,
        })
      );
    });
  });

  describe('createCheckoutSession', () => {
    test('falla con 503 si stripe no configurado', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(false);
      const req = { body: { userId: 1, successUrl: 'https://ok', cancelUrl: 'https://cancel' } };
      const res = mockRes();

      await controller.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/Stripe no configurado/i) })
      );
    });

    test('crea session y devuelve url', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      userModel.findById.mockResolvedValue({ id: 1, email: 'user@test.com' });
      process.env.STRIPE_PRICE_ID_MONTHLY = 'price_test_123';
      const create = jest.fn().mockResolvedValue({
        id: 'cs_test_1',
        url: 'https://checkout.stripe.com/cs_test_1',
      });
      stripeLib.getStripe.mockReturnValue({
        checkout: { sessions: { create } },
      });
      const req = { body: { userId: 1, successUrl: 'https://ok', cancelUrl: 'https://cancel' } };
      const res = mockRes();

      await controller.createCheckoutSession(req, res);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          client_reference_id: '1',
          line_items: [{ price: 'price_test_123', quantity: 1 }],
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        url: 'https://checkout.stripe.com/cs_test_1',
        sessionId: 'cs_test_1',
      });
    });

    test('devuelve 400 con userId inválido', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      const req = { body: { userId: 'abc', successUrl: 'https://ok', cancelUrl: 'https://cancel' } };
      const res = mockRes();

      await controller.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'userId inválido' }));
    });

    test('devuelve 400 si faltan successUrl/cancelUrl', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      const req = { body: { userId: 1 } };
      const res = mockRes();

      await controller.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/Faltan successUrl/i) })
      );
    });

    test('devuelve 404 cuando no existe el usuario', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      userModel.findById.mockResolvedValue(null);
      const req = { body: { userId: 99, successUrl: 'https://ok', cancelUrl: 'https://cancel' } };
      const res = mockRes();

      await controller.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Usuario no encontrado' }));
    });

    test('devuelve 500 cuando stripe lanza error al crear checkout', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      userModel.findById.mockResolvedValue({ id: 1, email: 'user@test.com' });
      stripeLib.getStripe.mockReturnValue({
        checkout: {
          sessions: {
            create: jest.fn().mockRejectedValue(new Error('stripe down')),
          },
        },
      });
      const req = { body: { userId: 1, successUrl: 'https://ok', cancelUrl: 'https://cancel' } };
      const res = mockRes();

      await controller.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/No se pudo crear la sesión/i) })
      );
    });
  });

  describe('cancelSubscription', () => {
    test('devuelve 503 si stripe no está configurado', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(false);
      const req = { body: { userId: 1 } };
      const res = mockRes();

      await controller.cancelSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    test('devuelve 404 si no existe suscripción activa', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      subscriptionModel.findByUserId.mockResolvedValue(null);
      const req = { body: { userId: 1 } };
      const res = mockRes();

      await controller.cancelSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('reactivateSubscription', () => {
    test('devuelve 400 con userId inválido', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      const req = { body: { userId: 'foo' } };
      const res = mockRes();

      await controller.reactivateSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('devuelve 500 cuando stripe falla al reactivar', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      subscriptionModel.findByUserId.mockResolvedValue({ stripe_subscription_id: 'sub_123' });
      stripeLib.getStripe.mockReturnValue({
        subscriptions: {
          update: jest.fn().mockRejectedValue(new Error('cannot update')),
        },
      });
      const req = { body: { userId: 7 } };
      const res = mockRes();

      await controller.reactivateSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('confirmCheckoutSession', () => {
    test('sin stripe configurado devuelve 503', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(false);
      const req = { body: { userId: 1, sessionId: 'cs_test_123' } };
      const res = mockRes();

      await controller.confirmCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    test('sin pago confirmado devuelve pending', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      const retrieve = jest.fn().mockResolvedValue({
        id: 'cs_test_1',
        payment_status: 'unpaid',
        client_reference_id: '1',
      });
      stripeLib.getStripe.mockReturnValue({ checkout: { sessions: { retrieve } } });
      const req = { body: { userId: 1, sessionId: 'cs_test_1' } };
      const res = mockRes();

      await controller.confirmCheckoutSession(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmed: false,
          pending: true,
        })
      );
    });

    test('userId o sessionId inválidos devuelven 400', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      const res = mockRes();
      await controller.confirmCheckoutSession({ body: { userId: 'x', sessionId: 'cs_1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);

      const res2 = mockRes();
      await controller.confirmCheckoutSession({ body: { userId: 1, sessionId: 'bad' } }, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    test('403 si client_reference_id no coincide con userId', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      const retrieve = jest.fn().mockResolvedValue({
        client_reference_id: '99',
        payment_status: 'paid',
        subscription: { id: 'sub_1', status: 'active', customer: 'cus_1', current_period_end: 1700000000 },
      });
      stripeLib.getStripe.mockReturnValue({ checkout: { sessions: { retrieve } } });
      const res = mockRes();
      await controller.confirmCheckoutSession({ body: { userId: 1, sessionId: 'cs_test_1' } }, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('pago confirmado sincroniza suscripción', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      subscriptionModel.upsertFromStripe.mockResolvedValue({
        status: 'active',
        stripe_subscription_id: 'sub_1',
      });
      const retrieve = jest.fn().mockResolvedValue({
        payment_status: 'paid',
        client_reference_id: '1',
        subscription: {
          id: 'sub_1',
          status: 'active',
          customer: 'cus_1',
          current_period_end: 1700000000,
          cancel_at_period_end: false,
        },
      });
      stripeLib.getStripe.mockReturnValue({ checkout: { sessions: { retrieve } } });
      const res = mockRes();
      await controller.confirmCheckoutSession({ body: { userId: 1, sessionId: 'cs_test_1' } }, res);
      expect(subscriptionModel.upsertFromStripe).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ confirmed: true, isPremium: true })
      );
    });

    test('confirmCheckoutSession devuelve 500 si retrieve falla', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      stripeLib.getStripe.mockReturnValue({
        checkout: {
          sessions: {
            retrieve: jest.fn().mockRejectedValue(new Error('stripe')),
          },
        },
      });
      const res = mockRes();
      await controller.confirmCheckoutSession({ body: { userId: 1, sessionId: 'cs_test_1' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getStatus edge', () => {
    test('400 sin userId válido', async () => {
      const res = mockRes();
      await controller.getStatus({ query: { userId: 'abc' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('500 si findByUserId lanza', async () => {
      subscriptionModel.findByUserId.mockRejectedValue(new Error('db'));
      const res = mockRes();
      await controller.getStatus({ query: { userId: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('cancelSubscription success', () => {
    test('cancela en Stripe y devuelve subscription', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      subscriptionModel.findByUserId.mockResolvedValue({ stripe_subscription_id: 'sub_123' });
      const sub = {
        id: 'sub_123',
        customer: 'cus_1',
        status: 'active',
        current_period_end: 1700000000,
        cancel_at_period_end: true,
      };
      stripeLib.getStripe.mockReturnValue({
        subscriptions: { update: jest.fn().mockResolvedValue(sub) },
      });
      subscriptionModel.upsertFromStripe.mockResolvedValue({ ...sub, status: 'active' });
      const res = mockRes();
      await controller.cancelSubscription({ body: { userId: 5 } }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, isPremium: true }));
    });

    test('400 userId inválido', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      const res = mockRes();
      await controller.cancelSubscription({ body: { userId: 'nope' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('500 si Stripe falla', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      subscriptionModel.findByUserId.mockResolvedValue({ stripe_subscription_id: 'sub_123' });
      stripeLib.getStripe.mockReturnValue({
        subscriptions: { update: jest.fn().mockRejectedValue(new Error('stripe')) },
      });
      const res = mockRes();
      await controller.cancelSubscription({ body: { userId: 5 } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('reactivateSubscription success', () => {
    test('503 si Stripe no está configurado', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(false);
      const res = mockRes();
      await controller.reactivateSubscription({ body: { userId: 1 } }, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    test('reactiva y devuelve ok', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      subscriptionModel.findByUserId.mockResolvedValue({ stripe_subscription_id: 'sub_123' });
      const sub = {
        id: 'sub_123',
        customer: 'cus_1',
        status: 'active',
        current_period_end: 1700000000,
        cancel_at_period_end: false,
      };
      stripeLib.getStripe.mockReturnValue({
        subscriptions: { update: jest.fn().mockResolvedValue(sub) },
      });
      subscriptionModel.upsertFromStripe.mockResolvedValue({ status: 'active' });
      const res = mockRes();
      await controller.reactivateSubscription({ body: { userId: 5 } }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });

    test('404 sin stripe_subscription_id', async () => {
      stripeLib.isStripeConfigured.mockReturnValue(true);
      subscriptionModel.findByUserId.mockResolvedValue({});
      const res = mockRes();
      await controller.reactivateSubscription({ body: { userId: 5 } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
