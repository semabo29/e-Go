jest.mock('../../lib/db', () => ({
  pool: { query: jest.fn() },
}));

const { pool } = require('../../lib/db');
const subscriptionModel = require('../../models/subscriptionModel');

describe('subscriptionModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('upsertFromStripe inserta y devuelve la fila', async () => {
    const row = { id: 1, usuari_id: 9, status: 'active' };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const out = await subscriptionModel.upsertFromStripe(9, {
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      status: 'active',
      current_period_end: new Date('2026-01-01'),
      cancel_at_period_end: false,
    });

    expect(out).toEqual(row);
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [, params] = pool.query.mock.calls[0];
    expect(params[0]).toBe(9);
    expect(params[1]).toBe('cus_1');
  });

  test('findByUserId devuelve null si no hay fila', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await subscriptionModel.findByUserId(1)).toBeNull();
  });

  test('findByStripeSubscriptionId devuelve fila', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });
    expect(await subscriptionModel.findByStripeSubscriptionId('sub_x')).toEqual({ id: 2 });
  });

  test('upsertFromStripe usa null para customer/subscription opcionales', async () => {
    const row = { id: 1 };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    await subscriptionModel.upsertFromStripe(1, {
      stripe_customer_id: undefined,
      stripe_subscription_id: undefined,
      status: 'inactive',
      current_period_end: undefined,
      cancel_at_period_end: false,
    });
    const [, params] = pool.query.mock.calls[0];
    expect(params[1]).toBeNull();
    expect(params[2]).toBeNull();
    expect(params[4]).toBeNull();
  });
});
