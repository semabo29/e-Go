describe('lib/stripe', () => {
  const realKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    jest.resetModules();
    if (realKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = realKey;
  });

  test('getStripe devuelve null si no hay STRIPE_SECRET_KEY', () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe } = require('../../lib/stripe');
    expect(getStripe()).toBeNull();
  });

  test('getStripe crea cliente y reutiliza la misma instancia', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_jest';
    const stripe = require('../../lib/stripe');
    const a = stripe.getStripe();
    const b = stripe.getStripe();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  test('isStripeConfigured exige STRIPE_SECRET_KEY y STRIPE_PRICE_ID_MONTHLY', () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_ID_MONTHLY;
    const { isStripeConfigured } = require('../../lib/stripe');
    expect(isStripeConfigured()).toBe(false);

    jest.resetModules();
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_x';
    const stripe2 = require('../../lib/stripe');
    expect(stripe2.isStripeConfigured()).toBe(true);
  });
});
