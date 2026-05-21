import type { TFunction } from 'i18next';

import type { Incidencia } from '@/services/incidenciaAdminService';

export const ADMIN_INCIDENT_TIPUS = [
  'Avariat',
  'Inexistent',
  'DadesIncorrectes',
  'Altres',
  'Operatiu',
] as const;

export type AdminIncidentTipus = (typeof ADMIN_INCIDENT_TIPUS)[number];

export const TIPUS_COLORS: Record<string, string> = {
  Avariat: '#fef3c7',
  Inexistent: '#fee2e2',
  DadesIncorrectes: '#ede9fe',
  Altres: '#f3f4f6',
  Operatiu: '#dcfce7',
};

export const TIPUS_TEXT_COLORS: Record<string, string> = {
  Avariat: '#92400e',
  Inexistent: '#b91c1c',
  DadesIncorrectes: '#5b21b6',
  Altres: '#374151',
  Operatiu: '#166534',
};

export type IncidentStatusKey = 'rejected' | 'resolved' | 'validated' | 'pending';

export function incidentStatusKey(inc: Incidencia): IncidentStatusKey {
  if (inc.rebutjada) return 'rejected';
  if (inc.resolta) return 'resolved';
  if (inc.validada) return 'validated';
  return 'pending';
}

export function incidentStatusLabel(inc: Incidencia, t: TFunction): string {
  return t(`adminIncidents.status.${incidentStatusKey(inc)}`);
}

export function incidentStatusColor(inc: Incidencia): string {
  const colors: Record<IncidentStatusKey, string> = {
    rejected: '#ef4444',
    resolved: '#10b981',
    validated: '#3b82f6',
    pending: '#f59e0b',
  };
  return colors[incidentStatusKey(inc)];
}

export function incidentTypeLabel(tipus: string, t: TFunction): string {
  return t(`adminIncidents.types.${tipus}`, { defaultValue: tipus });
}
