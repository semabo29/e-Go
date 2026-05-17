import { privilegedFetch } from '@/services/privilegedAuth';

export type IncidenciaTipus = 'Avariat' | 'Inexistent' | 'DadesIncorrectes' | 'Altres' | 'Operatiu';
export type IncidenciaEstado = 'pending' | 'validated' | 'resolved' | 'rejected';

export type Incidencia = {
  id: number;
  tipus: IncidenciaTipus;
  data_inici: string;
  comentari: string;
  arxiu: string | null;
  validada: boolean;
  resolta: boolean;
  rebutjada: boolean;
  motiu_rebuig: string | null;
  data_validacio: string | null;
  data_resolucio: string | null;
  data_rebuig: string | null;
  punts_atorgats: boolean;
  conductor: number;
  estacio: number;
  conductor_username: string;
  conductor_email: string;
  estacio_nom: string | null;
  estacio_municipi: string | null;
  estacio_provincia: string | null;
};

export async function listPendingIncidencias(): Promise<Incidencia[]> {
  const res = await privilegedFetch('admin', '/admin/incidencias/pending');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error cargando incidencias pendientes');
  return data.incidencias;
}

export async function listHistoryIncidencias(params: {
  from?: string;
  to?: string;
  tipus?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}): Promise<Incidencia[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.tipus) qs.set('tipus', params.tipus);
  if (params.estado) qs.set('estado', params.estado);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));

  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await privilegedFetch('admin', `/admin/incidencias/history${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error cargando histórico');
  return data.incidencias;
}

export async function validateIncidencia(id: number): Promise<{ incidencia: Incidencia; pointsAwarded: { points: number; isPremium: boolean } | null }> {
  const res = await privilegedFetch('admin', `/admin/incidencias/${id}/validate`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error validando incidencia');
  return data;
}

export async function rejectIncidencia(id: number, motiu?: string): Promise<Incidencia> {
  const res = await privilegedFetch('admin', `/admin/incidencias/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ motiu: motiu || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error rechazando incidencia');
  return data.incidencia;
}

export async function resolveIncidencia(id: number): Promise<Incidencia> {
  const res = await privilegedFetch('admin', `/admin/incidencias/${id}/resolve`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error resolviendo incidencia');
  return data.incidencia;
}
