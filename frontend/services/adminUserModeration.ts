import { privilegedFetch } from '@/services/privilegedAuth';

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  updated_at: string;
};

export async function listAdminUsers() {
  const res = await privilegedFetch('admin', '/admin/users');
  const data = (await res.json()) as { users?: AdminUser[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'No se pudo cargar la lista de usuarios');
  }
  return data.users || [];
}

export async function setUserBanStatus(userId: number, isBanned: boolean, reason?: string) {
  const res = await privilegedFetch('admin', `/admin/users/${userId}/ban`, {
    method: 'PATCH',
    body: JSON.stringify({ is_banned: isBanned, reason }),
  });
  const data = (await res.json()) as { user?: AdminUser; error?: string };
  if (!res.ok || !data.user) {
    throw new Error(data.error || 'No se pudo actualizar el estado del usuario');
  }
  return data.user;
}
