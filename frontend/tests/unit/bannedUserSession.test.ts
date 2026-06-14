import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  maybeHandleBannedResponse,
  releaseBannedAlertLock,
  setBannedUserSessionHandler,
} from '@/services/bannedUserSession';

function mockResponse(status: number, body?: unknown): Response {
  return {
    status,
    clone: () => ({
      json: async () => body,
    }),
  } as Response;
}

describe('bannedUserSession', () => {
  beforeEach(() => {
    setBannedUserSessionHandler(null);
    releaseBannedAlertLock();
  });

  afterEach(() => {
    setBannedUserSessionHandler(null);
    releaseBannedAlertLock();
  });

  it('maybeHandleBannedResponse no hace nada si status no es 403', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    await maybeHandleBannedResponse(mockResponse(200, { code: 'USER_BANNED' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('maybeHandleBannedResponse no hace nada si el cuerpo no es USER_BANNED', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    await maybeHandleBannedResponse(mockResponse(403, { code: 'OTHER', error: 'x' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('maybeHandleBannedResponse no hace nada si no hay handler registrado', async () => {
    await maybeHandleBannedResponse(
      mockResponse(403, { code: 'USER_BANNED', banned_reason: 'abuso' })
    );
  });

  it('maybeHandleBannedResponse ignora JSON invalido', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    const res = {
      status: 403,
      clone: () => ({
        json: async () => {
          throw new SyntaxError('invalid json');
        },
      }),
    } as unknown as Response;

    await maybeHandleBannedResponse(res);

    expect(handler).not.toHaveBeenCalled();
  });

  it('maybeHandleBannedResponse ignora cuerpo no objeto', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    await maybeHandleBannedResponse(mockResponse(403, 'texto'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('maybeHandleBannedResponse notifica con motivo de baneo', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    await maybeHandleBannedResponse(
      mockResponse(403, {
        code: 'USER_BANNED',
        error: 'Esta cuenta esta baneada',
        banned_reason: 'Incumplimiento',
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ banned_reason: 'Incumplimiento' });
  });

  it('maybeHandleBannedResponse normaliza motivo vacio a null', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    await maybeHandleBannedResponse(
      mockResponse(403, { code: 'USER_BANNED', banned_reason: '' })
    );

    expect(handler).toHaveBeenCalledWith({ banned_reason: null });
  });

  it('maybeHandleBannedResponse normaliza banned_reason null', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    await maybeHandleBannedResponse(mockResponse(403, { code: 'USER_BANNED', banned_reason: null }));

    expect(handler).toHaveBeenCalledWith({ banned_reason: null });
  });

  it('alertLock evita alertas duplicadas hasta releaseBannedAlertLock', async () => {
    const handler = jest.fn();
    setBannedUserSessionHandler(handler);

    const payload = { code: 'USER_BANNED', banned_reason: 'spam' };
    await maybeHandleBannedResponse(mockResponse(403, payload));
    await maybeHandleBannedResponse(mockResponse(403, payload));

    expect(handler).toHaveBeenCalledTimes(1);

    releaseBannedAlertLock();
    await maybeHandleBannedResponse(mockResponse(403, payload));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('setBannedUserSessionHandler permite sustituir el handler', async () => {
    const first = jest.fn();
    const second = jest.fn();
    setBannedUserSessionHandler(first);
    releaseBannedAlertLock();

    await maybeHandleBannedResponse(mockResponse(403, { code: 'USER_BANNED' }));
    expect(first).toHaveBeenCalledTimes(1);

    setBannedUserSessionHandler(second);
    releaseBannedAlertLock();

    await maybeHandleBannedResponse(mockResponse(403, { code: 'USER_BANNED' }));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
