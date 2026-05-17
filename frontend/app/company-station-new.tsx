import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ManualStationForm } from '@/components/stations/ManualStationForm';
import { FormState, initialStationFormState } from '@/components/stations/types';
import { fetchCompanyProfile } from '@/services/companyProfile';
import { getPrivilegedUser } from '@/services/privilegedAuth';
import { requestCreateCompanyStation, requestUpdateCompanyStation } from '@/services/stationModeration';

async function resolveCompanyNombre(): Promise<string | null> {
  const stored = await getPrivilegedUser<{ nombre?: string | null }>('company');
  const fromStore = stored?.nombre?.trim();
  if (fromStore) return fromStore;
  try {
    const profile = await fetchCompanyProfile();
    return profile.nombre?.trim() || null;
  } catch {
    return null;
  }
}

export default function CompanyStationNewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getParam = (key: string) => {
    const value = params[key as keyof typeof params];
    if (Array.isArray(value)) return value[0];
    return value as string | undefined;
  };
  const isEdit = getParam('mode') === 'edit';
  const stationId = getParam('id') ? Number(getParam('id')) : null;
  const [form, setForm] = useState<FormState>(initialStationFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEdit) {
      setForm({
        nom: getParam('nom') || '',
        latitud: getParam('latitud') || '',
        longitud: getParam('longitud') || '',
        kw: getParam('kw') || '',
        ac_dc: getParam('ac_dc') || '',
        tipus_connexio: getParam('tipus_connexio') || '',
        tipus_velocitat: getParam('tipus_velocitat') || '',
        adreca: getParam('adreca') || '',
        municipi: getParam('municipi') || '',
        provincia: getParam('provincia') || '',
        promotor: getParam('promotor') || '',
        acces: getParam('acces') || '',
      });
      return;
    }
    let cancelled = false;
    (async () => {
      const nombre = await resolveCompanyNombre();
      if (cancelled || !nombre) return;
      setForm((prev) => ({
        ...prev,
        promotor: prev.promotor.trim() ? prev.promotor : nombre,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  }

  async function submit() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      let res;
      if (isEdit && Number.isFinite(stationId)) {
        res = await requestUpdateCompanyStation(stationId!, form);
      } else if (isEdit) {
        setError('ID de estacion invalido');
        return;
      } else {
        res = await requestCreateCompanyStation(form);
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar la solicitud');
        return;
      }
      setSuccess(isEdit ? 'Solicitud de actualizacion enviada' : 'Solicitud de alta enviada');
      if (!isEdit) {
        const nombre = await resolveCompanyNombre();
        setForm(
          nombre ? { ...initialStationFormState, promotor: nombre } : initialStationFormState
        );
      }
    } catch (err) {
      setError(err instanceof Error && err.message === 'NO_SESSION' ? 'No hay sesion de empresa' : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ManualStationForm
      title={isEdit ? 'Solicitar edicion de estacion' : 'Solicitar nueva estacion'}
      subtitle="La solicitud quedara pendiente de revision admin"
      submitLabel={isEdit ? 'Enviar solicitud de edicion' : 'Enviar solicitud de alta'}
      loading={loading}
      error={error}
      success={success}
      form={form}
      onChange={updateField}
      onSubmit={submit}
      onBack={() => router.back()}
    />
  );
}
