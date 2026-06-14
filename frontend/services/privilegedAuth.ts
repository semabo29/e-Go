import AsyncStorage from '@react-native-async-storage/async-storage';

import { getApiUrl } from '@/constants/api';

export const PRIVILEGED_STORAGE_KEYS = {
  adminToken: '@ego_admin_token',
  adminUser: '@ego_admin_user',
  companyToken: '@ego_company_token',
  companyUser: '@ego_company_user',
} as const;

export type PrivilegedRole = 'admin' | 'company';

export type PrivilegedSession<TUser> = {
  token: string;
  user: TUser;
};

function keysForRole(role: PrivilegedRole) {
  return role === 'admin'
    ? {
        token: PRIVILEGED_STORAGE_KEYS.adminToken,
        user: PRIVILEGED_STORAGE_KEYS.adminUser,
      }
    : {
        token: PRIVILEGED_STORAGE_KEYS.companyToken,
        user: PRIVILEGED_STORAGE_KEYS.companyUser,
      };
}

export async function savePrivilegedSession<TUser>(
  role: PrivilegedRole,
  session: PrivilegedSession<TUser>
) {
  const keys = keysForRole(role);
  await AsyncStorage.multiSet([
    [keys.token, session.token],
    [keys.user, JSON.stringify(session.user)],
  ]);
}

export async function clearPrivilegedSession(role: PrivilegedRole) {
  const keys = keysForRole(role);
  await AsyncStorage.multiRemove([keys.token, keys.user]);
}

export async function getPrivilegedToken(role: PrivilegedRole) {
  return AsyncStorage.getItem(keysForRole(role).token);
}

export async function getPrivilegedUser<TUser>(role: PrivilegedRole) {
  const raw = await AsyncStorage.getItem(keysForRole(role).user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TUser;
  } catch (_e) {
    return null;
  }
}

export async function privilegedFetch(
  role: PrivilegedRole,
  path: string,
  init: RequestInit = {}
) {
  const token = await getPrivilegedToken(role);
  if (!token) {
    throw new Error('NO_SESSION');
  }
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${getApiUrl()}${path}`, { ...init, headers });
}
