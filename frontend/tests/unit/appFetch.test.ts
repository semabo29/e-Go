import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { appFetch } from '@/services/appFetch';

jest.mock('@/constants/api', () => ({
  getApiUrl: jest.fn(() => 'http://test.api'),
}));

jest.mock('@/services/bannedUserSession', () => ({
  maybeHandleBannedResponse: jest.fn<any>().mockResolvedValue(undefined),
}));

import { maybeHandleBannedResponse } from '@/services/bannedUserSession';
const mockBanned = maybeHandleBannedResponse as jest.MockedFunction<typeof maybeHandleBannedResponse>;

describe('appFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn<any>() as jest.MockedFunction<typeof fetch>;
  });

  test('prepends API base URL to relative path starting with /', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    await appFetch('/stations');
    expect(globalThis.fetch).toHaveBeenCalledWith('http://test.api/stations', undefined);
  });

  test('prepends / if path does not start with /', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true } as Response);
    await appFetch('stations');
    expect(globalThis.fetch).toHaveBeenCalledWith('http://test.api/stations', undefined);
  });

  test('uses full URL unchanged if it starts with http', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true } as Response);
    await appFetch('https://external.api/data');
    expect(globalThis.fetch).toHaveBeenCalledWith('https://external.api/data', undefined);
  });

  test('returns the fetch response', async () => {
    const mockRes = { ok: true, status: 200 } as Response;
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(mockRes);
    const result = await appFetch('/test');
    expect(result).toBe(mockRes);
  });

  test('calls maybeHandleBannedResponse with the response', async () => {
    const mockRes = { ok: false, status: 403 } as Response;
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce(mockRes);
    await appFetch('/test');
    expect(mockBanned).toHaveBeenCalledWith(mockRes);
  });

  test('passes init options to fetch', async () => {
    (globalThis.fetch as jest.Mock<any>).mockResolvedValueOnce({ ok: true } as Response);
    const init: RequestInit = { method: 'POST', body: '{}' };
    await appFetch('/test', init);
    expect(globalThis.fetch).toHaveBeenCalledWith('http://test.api/test', init);
  });
});