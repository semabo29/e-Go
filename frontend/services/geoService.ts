import { getApiUrl } from '@/constants/api';

export type GeoSuggestion = {
  formattedAddress: string;
  lat: number;
  lng: number;
  municipi: string | null;
  provincia: string | null;
};

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Respuesta invalida del servidor (${response.status})`);
  }
}

function httpErrorMessage(status: number, data: unknown): string {
  const body = data as { error?: string; details?: string } | null;
  const parts = [body?.error, body?.details].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  );
  if (parts.length) return parts.join(' — ');
  return `Error del servidor (${status})`;
}

export async function searchGeoAddress(query: string): Promise<GeoSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(`${getApiUrl()}/geo/search`);
  url.searchParams.set('q', q);

  const response = await fetch(url.toString());
  const data = await parseJsonBody(response);
  if (!response.ok) {
    throw new Error(httpErrorMessage(response.status, data));
  }
  return Array.isArray(data) ? (data as GeoSuggestion[]) : [];
}

export async function reverseGeoAddress(lat: number, lng: number): Promise<GeoSuggestion | null> {
  const url = new URL(`${getApiUrl()}/geo/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));

  const response = await fetch(url.toString());
  const data = await parseJsonBody(response);
  if (!response.ok) {
    throw new Error(httpErrorMessage(response.status, data));
  }
  if (data == null) return null;
  return data as GeoSuggestion;
}
