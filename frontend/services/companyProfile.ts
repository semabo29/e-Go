import { getPrivilegedToken, getPrivilegedUser, privilegedFetch, savePrivilegedSession } from '@/services/privilegedAuth';

export type CompanyProfile = {
  id: number;
  user_id: number;
  email: string;
  username: string;
  nombre: string | null;
  created_at: string;
};

export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  const res = await privilegedFetch('company', '/company/user');
  if (res.status === 401) throw new Error('NO_SESSION');
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Error al cargar empresa');
  return data.company as CompanyProfile;
}

export async function updateCompanyNombreOnServer(nombre: string): Promise<CompanyProfile> {
  const res = await privilegedFetch('company', '/company/profile', {
    method: 'PUT',
    body: JSON.stringify({ nombre }),
  });
  if (res.status === 401) throw new Error('NO_SESSION');
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo guardar');
  return data.company as CompanyProfile;
}

/** Mantiene coherentes los datos guardados con el login empresa. */
export async function mergeStoredCompanyUser(partial: Partial<CompanyProfile>) {
  const token = await getPrivilegedToken('company');
  const prev = await getPrivilegedUser<CompanyProfile>('company');
  if (token && prev) {
    await savePrivilegedSession('company', { token, user: { ...prev, ...partial } });
  }
}
