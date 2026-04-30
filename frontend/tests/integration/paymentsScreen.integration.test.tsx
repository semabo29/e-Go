import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import PaymentsScreen from '@/app/(tabs)/payments';
import { useAuth } from '@/contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

describe('PaymentsScreen integration (mocked fetch/WebBrowser)', () => {
  const userId = 7;

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as unknown as jest.Mock).mockReturnValue({
      user: { id: userId, email: 'u@test.com', username: 'u', created_at: '', updated_at: '' },
      logout: jest.fn(),
      isLoading: false,
      setUser: jest.fn(),
    });

    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'inactive',
            isPremium: false,
            current_period_end: null,
            cancel_at_period_end: false,
          }),
        } as any;
      }

      if (url.includes('/subscription/create-checkout-session')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ url: 'https://checkout.test/123', sessionId: 'cs_test_123' }),
        } as any;
      }

      if (url.includes('/subscription/confirm-checkout-session')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ confirmed: true, pending: false }),
        } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as unknown as typeof fetch;
  });

  // Si el usuario no tiene premium, se muestra el plan FREE y al pulsar "Pasar a Premium" se inicia checkout (POST + abrir browser con la URL).
  test('shows FREE plan and can start checkout', async () => {
    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');

    const { getByText } = render(<PaymentsScreen />);

    // Esperamos que se cargue el estado y aparezca el plan FREE
    await waitFor(() => {
      expect(getByText('Plan actual')).toBeTruthy();
    });

    fireEvent.press(getByText('Pasar a Premium'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscription/create-checkout-session'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('https://checkout.test/123');
    });
  });

  // Con `isPremium=true` y `cancel_at_period_end=false`, se muestra el boton de cancelar y se llama a POST `/subscription/cancel` (sin abrir browser).
  test('when isPremium=true and cancel_at_period_end=false: shows cancel button and calls /subscription/cancel', async () => {
    let statusResponse: any = {
      status: 'active',
      isPremium: true,
      current_period_end: '2026-12-31T00:00:00.000Z',
      cancel_at_period_end: false,
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/cancel') && options?.method === 'POST') {
        statusResponse = {
          status: 'inactive',
          isPremium: false,
          current_period_end: null,
          cancel_at_period_end: false,
        };
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');

    const { getByText, queryByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Cancelar suscripción')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancelar suscripción'));

    await waitFor(() => {
      expect(queryByText('Pasar a Premium')).toBeTruthy();
    });

    expect(
      (globalThis.fetch as unknown as jest.Mock).mock.calls.some(
        (c) => typeof c[0] === 'string' && c[0].includes('/subscription/cancel')
      )
    ).toBe(true);

    expect(openSpy).not.toHaveBeenCalled();
  });

  // Con `cancel_at_period_end=true`, se muestra el boton de reactivacion y se llama a POST `/subscription/reactivate`, tras lo cual el CTA cambia a FREE.
  test('when cancel_at_period_end=true: shows reactivation button and calls /subscription/reactivate', async () => {
    let statusResponse: any = {
      status: 'active',
      isPremium: true,
      current_period_end: '2026-12-31T00:00:00.000Z',
      cancel_at_period_end: true,
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/reactivate') && options?.method === 'POST') {
        statusResponse = {
          status: 'inactive',
          isPremium: false,
          current_period_end: null,
          cancel_at_period_end: false,
        };
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { getByText, queryByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Reactivar suscripción')).toBeTruthy();
    });

    expect(getByText('Tu suscripción está programada para cancelarse al final del periodo.')).toBeTruthy();

    fireEvent.press(getByText('Reactivar suscripción'));

    await waitFor(() => {
      expect(queryByText('Pasar a Premium')).toBeTruthy();
    });

    expect(
      (globalThis.fetch as unknown as jest.Mock).mock.calls.some(
        (c) => typeof c[0] === 'string' && c[0].includes('/subscription/reactivate')
      )
    ).toBe(true);
  });

  // Si falla la carga de estado (`/subscription/status` responde no-ok), se aplica el fallback como inactivo y se muestra el boton "Pasar a Premium".
  test('when /subscription/status fails: falls back to inactive and shows FREE plan button', async () => {
    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/subscription/status')) {
        return { ok: false, status: 500, json: async () => ({}) } as any;
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { getByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Pasar a Premium')).toBeTruthy();
    });
  });

  // Si el checkout responde pero NO trae URL (data.url vacío), no se abre el navegador
  test('when checkout session response has no url: does not open browser', async () => {
    let statusResponse: any = {
      status: 'inactive',
      isPremium: false,
      current_period_end: null,
      cancel_at_period_end: false,
    };

    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');
    const alertSpy = jest.spyOn(Alert, 'alert');

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/create-checkout-session') && options?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { getByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Pasar a Premium')).toBeTruthy();
    });

    fireEvent.press(getByText('Pasar a Premium'));

    await waitFor(() => {
      expect(openSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  // Si el backend responde no-ok en `/subscription/cancel`, la UI permanece en estado premium/cancel y no se abre browser.
  test('premium cancel non-ok keeps UI on premium and does not open browser', async () => {
    let statusResponse: any = {
      status: 'active',
      isPremium: true,
      current_period_end: '2026-12-31T00:00:00.000Z',
      cancel_at_period_end: false,
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/cancel') && options?.method === 'POST') {
        return {
          ok: false,
          status: 400,
          text: async () => 'boom',
        } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByText, queryByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Cancelar suscripción')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancelar suscripción'));

    await waitFor(() => {
      // Still premium mode (cancel button still visible)
      expect(getByText('Cancelar suscripción')).toBeTruthy();
      // No fallback to free plan CTA
      expect(queryByText('Pasar a Premium')).toBeNull();
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // Si el backend responde no-ok en `/subscription/reactivate`, la UI permanece en estado "cancel programada" y no se abre browser.
  test('premium reactivate non-ok keeps UI on scheduled cancel and does not open browser', async () => {
    let statusResponse: any = {
      status: 'active',
      isPremium: true,
      current_period_end: '2026-12-31T00:00:00.000Z',
      cancel_at_period_end: true,
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/reactivate') && options?.method === 'POST') {
        return {
          ok: false,
          status: 400,
          text: async () => 'boom',
        } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByText, queryByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Reactivar suscripción')).toBeTruthy();
    });

    fireEvent.press(getByText('Reactivar suscripción'));

    await waitFor(() => {
      // Still scheduled cancel (reactivate button remains)
      expect(getByText('Reactivar suscripción')).toBeTruthy();
      // Still no free CTA
      expect(queryByText('Pasar a Premium')).toBeNull();
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // Si ocurre un error de red (fetch reject) al cancelar premium, la UI permanece en estado premium/cancel y no se abre browser.
  test('premium cancel network error keeps UI on premium and does not open browser', async () => {
    let statusResponse: any = {
      status: 'active',
      isPremium: true,
      current_period_end: '2026-12-31T00:00:00.000Z',
      cancel_at_period_end: false,
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/cancel') && options?.method === 'POST') {
        throw new Error('network failed');
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByText, queryByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Cancelar suscripción')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancelar suscripción'));

    await waitFor(() => {
      // UI should remain premium/cancel mode after network failure.
      expect(getByText('Cancelar suscripción')).toBeTruthy();
      expect(queryByText('Pasar a Premium')).toBeNull();
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // Si ocurre un error de red (fetch reject) al reactivar premium, la UI permanece en estado "cancel programada" y no se abre browser.
  test('premium reactivate network error keeps UI on scheduled cancel and does not open browser', async () => {
    let statusResponse: any = {
      status: 'active',
      isPremium: true,
      current_period_end: '2026-12-31T00:00:00.000Z',
      cancel_at_period_end: true,
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/reactivate') && options?.method === 'POST') {
        throw new Error('network failed');
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByText, queryByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Reactivar suscripción')).toBeTruthy();
    });

    fireEvent.press(getByText('Reactivar suscripción'));

    await waitFor(() => {
      // UI should remain in scheduled-cancel mode after network failure.
      expect(getByText('Reactivar suscripción')).toBeTruthy();
      expect(queryByText('Pasar a Premium')).toBeNull();
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // Si el checkout responde no-ok, no se abre browser ni se muestra alert.
  test('checkout session non-ok does not open browser and does not show alerts', async () => {
    const openSpy = jest.spyOn(WebBrowser, 'openBrowserAsync');
    const alertSpy = jest.spyOn(Alert, 'alert');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const statusResponse: any = {
      status: 'inactive',
      isPremium: false,
      current_period_end: null,
      cancel_at_period_end: false,
    };

    (globalThis.fetch as any) = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/subscription/status')) {
        return { ok: true, status: 200, json: async () => statusResponse } as any;
      }

      if (url.includes('/subscription/create-checkout-session') && options?.method === 'POST') {
        return {
          ok: false,
          status: 400,
          text: async () => 'boom',
        } as any;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { getByText } = render(<PaymentsScreen />);

    await waitFor(() => {
      expect(getByText('Pasar a Premium')).toBeTruthy();
    });

    fireEvent.press(getByText('Pasar a Premium'));

    await waitFor(() => {
      expect(openSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

