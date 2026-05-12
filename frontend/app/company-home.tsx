import { useEffect, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ManualStationCard } from '@/components/stations/ManualStationCard';
import { ManualStation } from '@/components/stations/types';
import { clearPrivilegedSession, getPrivilegedToken } from '@/services/privilegedAuth';
import { listCompanyStations, requestDeleteCompanyStation } from '@/services/stationModeration';

export default function CompanyHomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stations, setStations] = useState<ManualStation[]>([]);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getPrivilegedToken('company');
      if (!token) {
        setError('No hay sesion de empresa');
        setLoading(false);
        return;
      }
      await refreshStations();
      setLoading(false);
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
              <TouchableOpacity style={styles.confirmDelete} onPress={async () => { if (confirmDeleteId !== null) await requestDelete(confirmDeleteId); setConfirmDeleteId(null); }}>
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
