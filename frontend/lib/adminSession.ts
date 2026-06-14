import { getPrivilegedToken, privilegedFetch } from '@/services/privilegedAuth';

export type AdminSessionPayload = {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

type AdminSessionMessages = {
  noSession: string;
  unauthorized: string;
  connectionError: string;
};

/**
 * Verifies the stored admin JWT and loads `/admin/me`. Used by admin panel screens
 * so auth bootstrap stays in one place (Sonar duplication / consistency).
 */
export async function fetchAdminSession(
  messages: AdminSessionMessages,
): Promise<
  | { ok: true; admin: AdminSessionPayload }
  | { ok: false; error: string }
> {
  try {
    const token = await getPrivilegedToken('admin');
    if (!token) {
      return { ok: false, error: messages.noSession };
    }
    const res = await privilegedFetch('admin', '/admin/me');
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || messages.unauthorized };
    }
    return { ok: true, admin: data.admin };
  } catch {
    return { ok: false, error: messages.connectionError };
  }
}
