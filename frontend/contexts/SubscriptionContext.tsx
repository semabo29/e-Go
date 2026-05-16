import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  buildFallbackStatus,
  type SubscriptionStatus,
} from '@/features/subscription/subscriptionHelpers';
import { appFetch } from '@/services/appFetch';

type SubscriptionContextValue = {
  subStatus: SubscriptionStatus | null;
  isPremium: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubStatus(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await appFetch(`/subscription/status?userId=${user.id}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as SubscriptionStatus;
      setSubStatus(data);
    } catch (err) {
      console.warn('[subscription] Error cargando estado:', err);
      setSubStatus(buildFallbackStatus());
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const value = useMemo(
    () => ({
      subStatus,
      isPremium: Boolean(subStatus?.isPremium),
      isLoading,
      refreshSubscription,
    }),
    [subStatus, isLoading, refreshSubscription]
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription debe usarse dentro de SubscriptionProvider');
  }
  return ctx;
}
