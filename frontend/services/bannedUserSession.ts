export type BannedUserPayload = {
  banned_reason: string | null;
};

type BannedHandler = (payload: BannedUserPayload) => void;

let handler: BannedHandler | null = null;
let alertLock = false;

export function setBannedUserSessionHandler(next: BannedHandler | null) {
  handler = next;
}

export function releaseBannedAlertLock() {
  alertLock = false;
}

function isUserBannedPayload(data: Record<string, unknown>): boolean {
  return data.code === 'USER_BANNED';
}

/**
 * Tras un 403 con code USER_BANNED, notifica al handler (p. ej. Alert + logout).
 * No consume el cuerpo del Response original.
 */
export async function maybeHandleBannedResponse(res: Response): Promise<void> {
  if (res.status !== 403) return;
  let data: unknown;
  try {
    data = await res.clone().json();
  } catch {
    return;
  }
  if (!data || typeof data !== 'object') return;
  const o = data as Record<string, unknown>;
  if (!isUserBannedPayload(o)) return;
  if (!handler) return;
  if (alertLock) return;
  alertLock = true;
  const reason = o.banned_reason == null || o.banned_reason === '' ? null : String(o.banned_reason);
  handler({ banned_reason: reason });
}
