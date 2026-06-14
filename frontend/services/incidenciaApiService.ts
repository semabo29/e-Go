import { getApiUrl } from '@/constants/api';

export type IncidenciaSubmitResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; conflict: boolean; error?: string };

export function buildIncidenciaFormData(params: {
  conductor: number;
  estacio: number;
  comentari: string;
  tipus: string;
}): FormData {
  const formData = new FormData();
  formData.append('comentari', params.comentari);
  formData.append('tipus', params.tipus);
  formData.append('conductor', String(params.conductor));
  formData.append('estacio', String(params.estacio));
  return formData;
}

export async function submitIncidencia(formData: FormData): Promise<IncidenciaSubmitResult> {
  const response = await fetch(`${getApiUrl()}/incidencias`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 409) {
    return { ok: false, status: 409, conflict: true, error: data?.error };
  }
  if (!response.ok) {
    return { ok: false, status: response.status, conflict: false, error: data?.error };
  }
  return { ok: true, data };
}

export async function submitSolvedIncidencia(
  conductor: number,
  estacio: number
): Promise<IncidenciaSubmitResult> {
  return submitIncidencia(
    buildIncidenciaFormData({
      conductor,
      estacio,
      comentari: 'La Incidencia está solucionada',
      tipus: 'Operatiu',
    })
  );
}
