jest.mock('../../lib/stripe', () => ({
  getStripe: jest.fn(),
}));

jest.mock('../../models/subscriptionModel', () => ({
  findByUserId: jest.fn(),
  upsertFromStripe: jest.fn(),
}));

const { getStripe } = require('../../lib/stripe');
const subscriptionModel = require('../../models/subscriptionModel');
const {
  scheduleSubscriptionCancelAtPeriodEnd,
} = require('../../services/stripeSubscriptionCancelAtPeriodEnd');

describe('scheduleSubscriptionCancelAtPeriodEnd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sin Stripe configurado -> stripe_unconfigured', async () => {
    getStripe.mockReturnValue(null);
    const r = await scheduleSubscriptionCancelAtPeriodEnd(5);
    expect(r).toEqual({ ok: false, reason: 'stripe_unconfigured' });
    expect(subscriptionModel.findByUserId).not.toHaveBeenCalled();
  });

  test('sin stripe_subscription_id en BD -> no_stripe_subscription', async () => {
    getStripe.mockReturnValue({});
    subscriptionModel.findByUserId.mockResolvedValue({ usuari_id: 5, status: 'inactive' });
    const r = await scheduleSubscriptionCancelAtPeriodEnd(5);
    expect(r).toEqual({ ok: false, reason: 'no_stripe_subscription' });
  });

  test('suscripcion ya canceled en Stripe -> sincroniza BD', async () => {
    const stripe = {
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_1',
          customer: 'cus_1',
          status: 'canceled',
          current_period_end: null,
          cancel_at_period_end: false,
        }),
      },
    };
    getStripe.mockReturnValue(stripe);
    subscriptionModel.findByUserId.mockResolvedValue({
      usuari_id: 5,
      stripe_subscription_id: 'sub_1',
    });
    subscriptionModel.upsertFromStripe.mockResolvedValue({ status: 'canceled' });

    const r = await scheduleSubscriptionCancelAtPeriodEnd(5);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('already_canceled');
    expect(r.subscription).toEqual({ status: 'canceled' });
    expect(stripe.subscriptions.update).toBeUndefined();
    expect(subscriptionModel.upsertFromStripe).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ status: 'canceled', stripe_subscription_id: 'sub_1' })
    );
  });

  test('ya tenia cancel_at_period_end -> sincroniza y no llama update', async () => {
    const sub = {
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      current_period_end: 1710000000,
      cancel_at_period_end: true,
    };
    const stripe = {
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue(sub),
      },
    };
    getStripe.mockReturnValue(stripe);
    subscriptionModel.findByUserId.mockResolvedValue({
      usuari_id: 5,
      stripe_subscription_id: 'sub_1',
    });
    subscriptionModel.upsertFromStripe.mockResolvedValue({ status: 'active' });

    const r = await scheduleSubscriptionCancelAtPeriodEnd(5);
    expect(r).toMatchObject({ ok: true, reason: 'already_cancel_at_period_end' });
    expect(stripe.subscriptions.update).toBeUndefined();
    expect(subscriptionModel.upsertFromStripe).toHaveBeenCalledWith(5, expect.objectContaining({ status: 'active' }));
  });

  test('suscripcion activa -> update cancel_at_period_end true (sigue active)', async () => {
    const afterUpdate = {
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      current_period_end: 1710000000,
      cancel_at_period_end: true,
    };
    const stripe = {
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_1',
          customer: 'cus_1',
          status: 'active',
          current_period_end: 1710000000,
          cancel_at_period_end: false,
        }),
        update: jest.fn().mockResolvedValue(afterUpdate),
      },
    };
    getStripe.mockReturnValue(stripe);
    subscriptionModel.findByUserId.mockResolvedValue({
      usuari_id: 5,
      stripe_subscription_id: 'sub_1',
    });
    subscriptionModel.upsertFromStripe.mockResolvedValue({ status: 'active', cancel_at_period_end: true });

    const r = await scheduleSubscriptionCancelAtPeriodEnd(5);
    expect(r).toMatchObject({ ok: true, reason: 'cancel_at_period_end_set' });
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
    expect(subscriptionModel.upsertFromStripe).toHaveBeenLastCalledWith(
      5,
      expect.objectContaining({
        status: 'active',
        cancel_at_period_end: true,
        stripe_customer_id: 'cus_1',
        stripe_subscription_id: 'sub_1',
      })
    );
  });
});
