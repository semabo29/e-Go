import { useEffect, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ManualStationCard } from '@/components/stations/ManualStationCard';
import { ManualStation } from '@/components/stations/types';
import {
  fetchCompanyProfile,
  mergeStoredCompanyUser,
  type CompanyProfile,
  updateCompanyNombreOnServer,
} from '@/services/companyProfile';
import { clearPrivilegedSession, getPrivilegedToken } from '@/services/privilegedAuth';
import { listCompanyStations, requestDeleteCompanyStation } from '@/services/stationModeration';

export default function CompanyHomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stations, setStations] = useState<ManualStation[]>([]);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [editingNombre, setEditingNombre] = useState(false);
  const [nombreDraft, setNombreDraft] = useState('');
  const [savingNombre, setSavingNombre] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getPrivilegedToken('company');
      if (!token) {
        setError('No hay sesion de empresa');
        setLoading(false);
        return;
      }
      try {
        const [profile] = await Promise.all([fetchCompanyProfile(), refreshStations()]);
        setCompanyProfile(profile);
        setNombreDraft(profile.nombre?.trim() ?? '');
      } catch (err) {
        setError(
          err instanceof Error && err.message === 'NO_SESSION'
            ? 'No hay sesion de empresa'
            : 'No se pudo cargar el perfil de empresa'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refreshStations() {
    setLoadingStations(true);
    setError('');
    try {
      const data = await listCompanyStations();
      setStations(data);
    } catch (err) {
      setError(err instanceof Error && err.message === 'NO_SESSION' ? 'No hay sesion de empresa' : 'No se pudieron cargar las estaciones');
    } finally {
      setLoadingStations(false);
    }
  }

  async function saveNombreEmpresa() {
    setSavingNombre(true);
    setError('');
    try {
      const updated = await updateCompanyNombreOnServer(nombreDraft);
      setCompanyProfile(updated);
      await mergeStoredCompanyUser({ nombre: updated.nombre });
      setEditingNombre(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el nombre');
    } finally {
      setSavingNombre(false);
    }
  }

  async function requestDelete(id: number) {
    setLoadingStations(true);
    try {
      const res = await requestDeleteCompanyStation(id);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar la solicitud');
        return;
      }
      await refreshStations();
    } catch (_e) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoadingStations(false);
    }
  }

  async function logoutCompany() {
    await clearPrivilegedSession('company');
    router.replace('/company-login' as Href);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Panel Empresa</Text>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.muted}>Verificando sesion…</Text>
          </View>
        ) : error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/company-login' as Href)}>
              <Text style={styles.primaryButtonText}>Ir al login empresa</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.companyHeader}>
              <Text style={styles.companyNameLabel}>Empresa</Text>
              <Text style={styles.companyNameValue}>
                {companyProfile?.nombre?.trim() ? companyProfile.nombre.trim() : 'Sin nombre'}
              </Text>
              {companyProfile?.email ? (
                <Text style={styles.companyEmail}>{companyProfile.email}</Text>
              ) : null}
            </View>
            {editingNombre ? (
              <View style={styles.nombreEditBlock}>
                <Text style={styles.nombreEditLabel}>Nombre de la empresa</Text>
                <TextInput
                  style={styles.nombreInput}
                  value={nombreDraft}
                  onChangeText={setNombreDraft}
                  placeholder="Nombre comercial"
                  placeholderTextColor="#9ca3af"
                  editable={!savingNombre}
                />
                <View style={styles.nombreEditActions}>
                  <TouchableOpacity
                    style={styles.nombreCancelBtn}
                    onPress={() => {
                      setNombreDraft(companyProfile?.nombre?.trim() ?? '');
                      setEditingNombre(false);
                    }}
                    disabled={savingNombre}
                  >
                    <Text style={styles.nombreCancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.nombreSaveBtn, savingNombre && styles.nombreSaveBtnDisabled]}
                    onPress={saveNombreEmpresa}
                    disabled={savingNombre || !nombreDraft.trim()}
                  >
                    <Text style={styles.nombreSaveBtnText}>{savingNombre ? 'Guardando…' : 'Guardar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => {
                  setNombreDraft(companyProfile?.nombre?.trim() ?? '');
                  setEditingNombre(true);
                }}
              >
                <Text style={styles.outlineButtonText}>Cambiar nombre de empresa</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/company-station-new' as Href)}>
              <Text style={styles.primaryButtonText}>Nueva solicitud de estacion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/company-requests' as Href)}>
              <Text style={styles.secondaryButtonText}>Ver mis solicitudes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={logoutCompany}>
              <Text style={styles.logoutButtonText}>Cerrar sesion empresa</Text>
            </TouchableOpacity>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Estaciones de la empresa</Text>
                <TouchableOpacity onPress={refreshStations} disabled={loadingStations}>
                  <Text style={styles.sectionLink}>{loadingStations ? 'Actualizando…' : 'Actualizar'}</Text>
                </TouchableOpacity>
              </View>
              {loadingStations ? (
                <Text style={styles.muted}>Cargando estaciones…</Text>
              ) : stations.length === 0 ? (
                <Text style={styles.muted}>No tienes estaciones aprobadas.</Text>
              ) : (
                stations.map((s) => (
                  <ManualStationCard
                    key={s.id}
                    station={s}
                    onEdit={() =>
                      router.push(({
                        pathname: '/company-station-new' as Href,
                        params: {
                          mode: 'edit',
                          id: String(s.id),
                          nom: s.nom || '',
                          latitud: s.latitud ? String(s.latitud) : '',
                          longitud: s.longitud ? String(s.longitud) : '',
                          kw: s.kw !== undefined && s.kw !== null ? String(s.kw) : '',
                          ac_dc: s.ac_dc || '',
                          tipus_connexio: s.tipus_connexio || '',
                          tipus_velocitat: s.tipus_velocitat || '',
                          adreca: s.adreca || '',
                          municipi: s.municipi || '',
                          provincia: s.provincia || '',
                          promotor: s.promotor || '',
                          acces: s.acces || '',
                        },
                      }) as Href)
                    }
                    onDelete={() => setConfirmDeleteId(s.id)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </View>
      <Modal visible={confirmDeleteId !== null} transparent animationType="fade" onRequestClose={() => setConfirmDeleteId(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Solicitar borrado</Text>
            <Text style={styles.confirmText}>Se enviara una solicitud para eliminar esta estacion.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmDeleteId(null)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={async () => {
                  if (confirmDeleteId !== null) {
                    await requestDelete(confirmDeleteId);
                  }
                  setConfirmDeleteId(null);
                }}
              >
                <Text style={styles.confirmDeleteText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' }, scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 40 },
  card: { width: '100%', maxWidth: 460, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 3 }, title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  companyHeader: { marginBottom: 14, alignItems: 'center' },
  companyNameLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  companyNameValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4, textAlign: 'center' },
  companyEmail: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  outlineButton: { marginBottom: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  outlineButtonText: { color: '#111827', fontWeight: '600', fontSize: 14 },
  nombreEditBlock: { marginBottom: 14 },
  nombreEditLabel: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 },
  nombreInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#111827', marginBottom: 10 },
  nombreEditActions: { flexDirection: 'row', gap: 10 },
  nombreCancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center' },
  nombreCancelBtnText: { fontWeight: '600', color: '#111827' },
  nombreSaveBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  nombreSaveBtnDisabled: { opacity: 0.55 },
  nombreSaveBtnText: { fontWeight: '600', color: '#fff' },
  centered: { alignItems: 'center', gap: 10 }, muted: { fontSize: 14, color: '#6b7280' }, errorText: { color: '#dc2626', textAlign: 'center', marginBottom: 10 },
  primaryButton: { marginTop: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' }, primaryButtonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: { marginTop: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center' }, secondaryButtonText: { color: '#111827', fontWeight: '600' },
  logoutButton: { marginTop: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center' }, logoutButtonText: { color: '#b91c1c', fontWeight: '600' },
  section: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 14 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { fontSize: 16, fontWeight: '700' }, sectionLink: { fontWeight: '600' },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 16, padding: 20 }, confirmTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 }, confirmText: { color: '#4b5563', marginBottom: 16 },
  confirmActions: { flexDirection: 'row', gap: 10 }, confirmCancel: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center' }, confirmCancelText: { fontWeight: '600' },
  confirmDelete: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' }, confirmDeleteText: { color: '#fff', fontWeight: '600' },
});
