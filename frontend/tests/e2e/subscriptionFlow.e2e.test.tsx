/**
 * E2E de flujo UI: pantalla de pagaments → suscripció Premium → cancel·lació → reactivació.
 *
 * Usa mocks d'infraestructura (fetch, auth, WebBrowser) però components reals
 * de PaymentsScreen i SubscriptionProvider (unmocked).
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/components/WelcomePremiumModal', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    WelcomePremiumModal: ({
      visible,
      onDismiss,
    }: {
      visible: boolean;
      onDismiss: () => void;
    }) => {
      if (!visible) return null;
      return React.createElement(
        Pressable,
        { testID: 'welcome-premium-dismiss', onPress: onDismiss },
        React.createElement(Text, null, 'WelcomePremiumMock')
      );
    },
  };
});

jest.unmock('@/contexts/SubscriptionContext');

import PaymentsScreen from '@/app/(tabs)/payments';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import * as WebBrowser from 'expo-web-browser';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

const es = require('@/i18n/locales/es').default;
const P = es.payments;
const C = es.common;

function renderPayments() {
  return render(
    <SubscriptionProvider>
      <PaymentsScreen />
    </SubscriptionProvider>
  );
}

describe('E2E: Flux complet de subscripció (Free → Premium → Cancel → Reactivar)', () => {
  const userId = 42;

  let statusResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    statusResponse = {
      status: 'inactive',
      isPremium: false,
      current_period_end: null,
      cancel_at_period_end: false,
    };

    (useAuth as unknown as jest.Mock).mockReturnValue({
      user: { id: userId, email: 'e2e@test.com', username: 'e2eTester', created_at: '', updated_at: '' },
      logout: jest.fn(),
      isLoading: false,
      setUser: jest.fn(),
    });

    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      const href = String(url);

      if (href.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (href.includes('/subscription/create-checkout-session') && options?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ url: 'https://checkout.stripe.test/sess_e2e', sessionId: 'cs_e2e_123' }),
        } as any;
      }

      if (href.includes('/subscription/confirm-checkout-session') && options?.method === 'POST') {
        statusResponse = {
          status: 'active',
          isPremium: true,
          current_period_end: '2027-05-25T00:00:00.000Z',
          cancel_at_period_end: false,
        };
        return { ok: true, status: 200, json: async () => ({ confirmed: true, pending: false }) } as any;
      }

      if (href.includes('/subscription/cancel') && options?.method === 'POST') {
        statusResponse = {
          ...statusResponse,
          cancel_at_period_end: true,
        };
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      if (href.includes('/subscription/reactivate') && options?.method === 'POST') {
        statusResponse = {
          ...statusResponse,
          cancel_at_period_end: false,
        };
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      throw new Error(`Unexpected fetch URL: ${href}`);
    }) as unknown as typeof fetch;
  });

  test('usuari FREE veu plans, fa checkout, es converteix en Premium', async () => {
    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync').mockResolvedValue(undefined as any);

    const { getByText, getByTestId } = renderPayments();

    await waitFor(() => {
      expect(getByText(P.currentPlan)).toBeTruthy();
    });
    expect(getByText(P.freeName)).toBeTruthy();
    expect(getByText(P.freePrice)).toBeTruthy();
    expect(getByText(P.premiumName)).toBeTruthy();
    expect(getByText(P.premiumPrice)).toBeTruthy();

    expect(getByText(P.goPremium)).toBeTruthy();
    fireEvent.press(getByText(P.goPremium));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscription/create-checkout-session'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('https://checkout.stripe.test/sess_e2e');
    });

    await waitFor(() => {
      expect(getByTestId('welcome-premium-dismiss')).toBeTruthy();
    });

    fireEvent.press(getByTestId('welcome-premium-dismiss'));

    openSpy.mockRestore();
  });

  test('usuari Premium cancel·la la subscripció', async () => {
    statusResponse = {
      status: 'active',
      isPremium: true,
      current_period_end: '2027-05-25T00:00:00.000Z',
      cancel_at_period_end: false,
    };

    const { getByText } = renderPayments();

    await waitFor(() => {
      expect(getByText(P.cancelSub)).toBeTruthy();
    });
    expect(getByText(C.active)).toBeTruthy();

    fireEvent.press(getByText(P.cancelSub));

    await waitFor(() => {
      expect(
        (globalThis.fetch as unknown as jest.Mock).mock.calls.some(
          (c) => typeof c[0] === 'string' && c[0].includes('/subscription/cancel')
        )
      ).toBe(true);
    });

    await waitFor(() => {
      expect(getByText(P.reactivate)).toBeTruthy();
    });
    expect(getByText(P.cancelScheduled)).toBeTruthy();
  });

  test('usuari amb cancel·lació programada reactiva la subscripció', async () => {
    statusResponse = {
      status: 'active',
      isPremium: true,
      current_period_end: '2027-05-25T00:00:00.000Z',
      cancel_at_period_end: true,
    };

    const { getByText, queryByText } = renderPayments();

    await waitFor(() => {
      expect(getByText(P.cancelScheduled)).toBeTruthy();
    });
    expect(getByText(P.reactivate)).toBeTruthy();

    fireEvent.press(getByText(P.reactivate));

    await waitFor(() => {
      expect(
        (globalThis.fetch as unknown as jest.Mock).mock.calls.some(
          (c) => typeof c[0] === 'string' && c[0].includes('/subscription/reactivate')
        )
      ).toBe(true);
    });

    await waitFor(() => {
      expect(queryByText(P.cancelScheduled)).toBeNull();
    });
  });

  test('error de xarxa al fer checkout no obre el navegador', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (String(url).includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }
      if (String(url).includes('/subscription/create-checkout-session')) {
        throw new Error('network failed');
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByText } = renderPayments();

    await waitFor(() => {
      expect(getByText(P.goPremium)).toBeTruthy();
    });

    fireEvent.press(getByText(P.goPremium));

    await waitFor(() => {
      expect(openSpy).not.toHaveBeenCalled();
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    openSpy.mockRestore();
  });

  test('sense usuari no es fa cap petició', async () => {
    (useAuth as unknown as jest.Mock).mockReturnValue({
      user: null,
      logout: jest.fn(),
      isLoading: false,
      setUser: jest.fn(),
    });

    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    renderPayments();

    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
