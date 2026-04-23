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
  });
});
