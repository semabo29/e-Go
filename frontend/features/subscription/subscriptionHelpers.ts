export type SubscriptionStatus = {
  status: string;
  isPremium: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function formatPeriodEnd(dateIso: string | null): string | null {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-ES');
}

export function buildFallbackStatus(): SubscriptionStatus {
  return {
    status: 'inactive',
    isPremium: false,
    current_period_end: null,
    cancel_at_period_end: false,
  };
}

export function isPremiumStatus(status: string): boolean {
  return ['active', 'trialing'].includes(status);
}
