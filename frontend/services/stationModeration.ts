import { FormState, ManualStation, StationRequest } from '@/components/stations/types';
import { privilegedFetch } from '@/services/privilegedAuth';

export type AdminStationSummary = {
  id: number;
  nom: string;
  municipi: string | null;
  provincia: string | null;
  adreca: string | null;
  kw: number | string | null;
  ac_dc: string | null;
  tipus_connexio: string | null;
  is_manual: boolean;
  operatiu: boolean;
};

function toPayload(form: FormState) {
  return {
    ...form,
    latitud: form.latitud ? Number(form.latitud) : form.latitud,
    longitud: form.longitud ? Number(form.longitud) : form.longitud,
    kw: form.kw ? Number(form.kw) : form.kw,
  };
}

export async function listAdminStations() {
  const res = await privilegedFetch('admin', '/admin/stations/mine');
  return (await res.json()) as ManualStation[];
}

export async function listAllAdminStations(
  q = '',
  offset = 0
): Promise<{ stations: AdminStationSummary[]; hasMore: boolean }> {
  const params = new URLSearchParams({ offset: String(offset) });
  if (q) params.set('q', q);
  const res = await privilegedFetch('admin', `/admin/stations?${params.toString()}`);
  return (await res.json()) as { stations: AdminStationSummary[]; hasMore: boolean };
}

export async function setStationOperatiu(id: number, operatiu: boolean): Promise<AdminStationSummary> {
  const res = await privilegedFetch('admin', `/admin/stations/${id}/operatiu`, {
    method: 'PATCH',
    body: JSON.stringify({ operatiu }),
  });
  return (await res.json()) as AdminStationSummary;
}

export async function createAdminStation(form: FormState) {
  const res = await privilegedFetch('admin', '/admin/stations', {
    method: 'POST',
    body: JSON.stringify(toPayload(form)),
  });
  return res;
}

export async function updateAdminStation(id: number, form: FormState) {
  const payload = Object.fromEntries(
    Object.entries(toPayload(form)).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await privilegedFetch('admin', `/admin/stations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res;
}

export async function deleteAdminStation(id: number) {
  return privilegedFetch('admin', `/admin/stations/${id}`, { method: 'DELETE' });
}

export async function listCompanyStations() {
  const res = await privilegedFetch('company', '/company/stations/mine');
  return (await res.json()) as ManualStation[];
}

export async function listCompanyRequests() {
  const res = await privilegedFetch('company', '/company/station-requests/mine');
  return (await res.json()) as StationRequest[];
}

export async function requestCreateCompanyStation(form: FormState) {
  return privilegedFetch('company', '/company/stations', {
    method: 'POST',
    body: JSON.stringify(toPayload(form)),
  });
}

export async function requestUpdateCompanyStation(id: number, form: FormState) {
  const payload = Object.fromEntries(
    Object.entries(toPayload(form)).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );
  return privilegedFetch('company', `/company/stations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function requestDeleteCompanyStation(id: number) {
  return privilegedFetch('company', `/company/stations/${id}`, { method: 'DELETE' });
}

export async function listPendingRequests() {
  const res = await privilegedFetch('admin', '/admin/station-requests/pending');
  return (await res.json()) as StationRequest[];
}

export async function approveRequest(id: number) {
  return privilegedFetch('admin', `/admin/station-requests/${id}/approve`, { method: 'POST' });
}

export async function rejectRequest(id: number, rejection_reason: string) {
  return privilegedFetch('admin', `/admin/station-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejection_reason }),
  });
}
