import { describe, expect, test } from 'vitest';
import { buildFallbackStatus, formatPeriodEnd, isPremiumStatus } from './subscriptionHelpers';

describe('subscriptionHelpers', () => {
  test('formatPeriodEnd devuelve null cuando fecha es null o inválida', () => {
    expect(formatPeriodEnd(null)).toBeNull();
    expect(formatPeriodEnd('not-a-date')).toBeNull();
  });

  test('formatPeriodEnd formatea fecha válida', () => {
    expect(formatPeriodEnd('2026-01-15T00:00:00.000Z')).toBe('15/1/2026');
  });

  test('buildFallbackStatus devuelve estado inactivo', () => {
    expect(buildFallbackStatus()).toEqual({
      status: 'inactive',
      isPremium: false,
      current_period_end: null,
      cancel_at_period_end: false,
    });
  });

  test('isPremiumStatus reconoce active y trialing', () => {
    expect(isPremiumStatus('active')).toBe(true);
    expect(isPremiumStatus('trialing')).toBe(true);
    expect(isPremiumStatus('canceled')).toBe(false);
  });
});
