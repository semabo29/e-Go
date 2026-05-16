import { describe, test, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/constants/api', () => ({
  getApiUrl: jest.fn(() => 'http://test.api'),
}));

import { searchGeoAddress, reverseGeoAddress } from '@/services/geoService';

const mockSuggestion = {
  formattedAddress: 'Carrer Test 1, Barcelona',
  lat: 41.38,
  lng: 2.17,
  municipi: 'Barcelona',
  provincia: 'Barcelona',
};

describe('geoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  describe('searchGeoAddress', () => {
    test('returns empty array for empty query', async () => {
      const result = await searchGeoAddress('');
      expect(result).toEqual([]);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    test('returns empty array for whitespace-only query', async () => {
      const result = await searchGeoAddress('   ');
      expect(result).toEqual([]);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    test('calls correct API endpoint with trimmed query', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([mockSuggestion]),
        status: 200,
      } as Response);

      await searchGeoAddress('  barcelona  ');
      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/geo/search');
      expect(url).toContain('q=barcelona');
    });

    test('returns array of suggestions on success', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([mockSuggestion]),
        status: 200,
      } as Response);

      const result = await searchGeoAddress('barcelona');
      expect(result).toEqual([mockSuggestion]);
    });

    test('returns empty array when response is not an array', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ error: 'wrong format' }),
        status: 200,
      } as Response);

      const result = await searchGeoAddress('barcelona');
      expect(result).toEqual([]);
    });

    test('throws error with server message on non-ok response', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ error: 'Not found', details: 'No results' }),
        status: 404,
      } as Response);

      await expect(searchGeoAddress('xzxzxz')).rejects.toThrow('Not found');
    });

    test('throws error with fallback message when no error field', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({}),
        status: 500,
      } as Response);

      await expect(searchGeoAddress('test')).rejects.toThrow('Error del servidor (500)');
    });

    test('throws error with only details field when error is absent', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ details: 'Rate limited' }),
        status: 429,
      } as Response);

      await expect(searchGeoAddress('test')).rejects.toThrow('Rate limited');
    });

    test('throws parse error for invalid JSON response', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => 'not-json',
        status: 500,
      } as Response);

      await expect(searchGeoAddress('test')).rejects.toThrow(/invalida/);
    });

    test('handles empty response body gracefully (non-ok)', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => '',
        status: 404,
      } as Response);

      await expect(searchGeoAddress('test')).rejects.toThrow(/servidor/);
    });
  });

  describe('reverseGeoAddress', () => {
    test('calls correct API endpoint with lat/lng params', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockSuggestion),
        status: 200,
      } as Response);

      await reverseGeoAddress(41.38, 2.17);
      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/geo/reverse');
      expect(url).toContain('lat=41.38');
      expect(url).toContain('lng=2.17');
    });

    test('returns suggestion on success', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockSuggestion),
        status: 200,
      } as Response);

      const result = await reverseGeoAddress(41.38, 2.17);
      expect(result).toEqual(mockSuggestion);
    });

    test('returns null when response body is empty', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        text: async () => '',
        status: 200,
      } as Response);

      const result = await reverseGeoAddress(41.38, 2.17);
      expect(result).toBeNull();
    });

    test('throws error on non-ok response', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ error: 'Not authorized' }),
        status: 401,
      } as Response);

      await expect(reverseGeoAddress(0, 0)).rejects.toThrow('Not authorized');
    });

    test('throws error with fallback message on non-ok with no error field', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({}),
        status: 503,
      } as Response);

      await expect(reverseGeoAddress(0, 0)).rejects.toThrow('Error del servidor (503)');
    });

    test('throws parse error on invalid JSON', async () => {
      (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        text: async () => '<html>error</html>',
        status: 502,
      } as Response);

      await expect(reverseGeoAddress(0, 0)).rejects.toThrow(/invalida/);
    });
  });
});