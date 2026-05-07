import { getApiUrl } from '@/constants/api';

export type GeoSuggestion = {
  formattedAddress: string;
  lat: number;
  lng: number;
  municipi: string | null;
  provincia: string | null;
};

export async function searchGeoAddress(query: string): Promise<GeoSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(`${getApiUrl()}/geo/search`);
  url.searchParams.set('q', q);

  const response = await fetch(url.toString());
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo buscar la direccion');
  }
  return Array.isArray(data) ? data : [];
}

export async function reverseGeoAddress(lat: number, lng: number): Promise<GeoSuggestion | null> {
  const url = new URL(`${getApiUrl()}/geo/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));

  const response = await fetch(url.toString());
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo resolver la direccion');
  }
  return data ?? null;
}
