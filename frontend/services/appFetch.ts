import { getApiUrl } from '@/constants/api';
import { maybeHandleBannedResponse } from '@/services/bannedUserSession';

function resolveAppApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = getApiUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * fetch al API de la app: si el usuario está baneado (403 + code USER_BANNED),
 * dispara el flujo global (alerta + logout) antes de devolver el Response.
 */
export async function appFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = resolveAppApiUrl(path);
  const res = await fetch(url, init);
  await maybeHandleBannedResponse(res);
  return res;
}
