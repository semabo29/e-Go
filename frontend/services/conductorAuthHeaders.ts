type TokenGetter = () => string | null | undefined;

let tokenGetter: TokenGetter | null = null;

/** Registra la función que devuelve el JWT del conductor (p. ej. desde AuthContext). */
export function setConductorTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

export function getConductorAuthToken(): string | null {
  const token = tokenGetter?.();
  return token && token.trim().length > 0 ? token.trim() : null;
}

/** Cabeceras Authorization para APIs de conductor. */
export function getConductorAuthHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getConductorAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

/** Conductor amb JWT (no mode convidat sense login). */
export function canUseConductorApi(user?: { token?: string } | null): boolean {
  return Boolean(user?.token?.trim());
}
