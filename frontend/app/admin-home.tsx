import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_TOKEN_KEY = '@ego_admin_token';
const ADMIN_USER_KEY = '@ego_admin_user';

type AdminPayload = {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

type AdminStation = {
  id: number;
  nom: string;
  created_at: string;
  external_id?: string | null;
  latitud?: string | number | null;
  longitud?: string | number | null;
  tipus_connexio?: string | null;
  tipus_velocitat?: string | null;
  adreca?: string | null;
  municipi?: string;
  provincia?: string;
  kw?: string | number;
  ac_dc?: string | null;
  promotor?: string | null;
  acces?: string | null;
};

export default function AdminHomeScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminPayload | null>(null);
  const [error, setError] = useState('');
  const [stations, setStations] = useState<AdminStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) {
          setError('No hay sesion admin');
          return;
        }
        const res = await fetch(`${API_URL}/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'No autorizado');
          return;
        }
        setAdmin(data.admin);
        await loadMyStations(token);
      } catch (err) {
        setError('No se pudo conectar con el servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logoutAdmin() {
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    await AsyncStorage.removeItem(ADMIN_USER_KEY);
    router.replace('/admin-login');
  }

  async function loadMyStations(token: string) {
    setLoadingStations(true);
    try {
      const res = await fetch(`${API_URL}/admin/stations/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudieron cargar las estaciones');
        return;
      }
      setStations(data);
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoadingStations(false);
    }
  }

  async function deleteStation(id: number) {
    const token = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setError('No hay sesion admin');
      return;
    }
    setLoadingStations(true);
    try {
      const res = await fetch(`${API_URL}/admin/stations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo borrar la estacion');
        return;
      }
      setStations((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoadingStations(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Home</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.muted}>Verificando token…</Text>
          </View>
        ) : error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/admin-login')}>
              <Text style={styles.primaryButtonText}>Volver al login admin</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{admin?.email}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Rol</Text>
              <Text style={styles.infoValue}>{admin?.role}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/admin-station-new')}
            >
              <Text style={styles.primaryButtonText}>Anadir estacion manual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButtonAlt}
              onPress={() => {
                (async () => {
                  if (!admin?.email) return;
                  try {
                    const token = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
                    if (!token) {
                      setError('No hay sesion admin');
                      return;
                    }
                    const userRes = await fetch(`${API_URL}/admin/user`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const userData = await userRes.json();
                    if (!userRes.ok || !userData.user) {
                      setError(userData.error || 'No se pudo cargar el usuario');
                      return;
                    }
                    setUser(userData.user);
                    router.replace('/(tabs)');
                  } catch (err) {
                    setError('No se pudo conectar con el servidor');
                  }
                })();
              }}
            >
              <Text style={styles.primaryButtonAltText}>Ir a la aplicacion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={logoutAdmin}>
              <Text style={styles.secondaryButtonText}>Cerrar sesion admin</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tus estaciones manuales</Text>
                <TouchableOpacity
                  onPress={async () => {
                    const token = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
                    if (token) await loadMyStations(token);
                  }}
                  disabled={loadingStations}
                >
                  <Text style={styles.sectionLink}>
                    {loadingStations ? 'Actualizando…' : 'Actualizar'}
                  </Text>
                </TouchableOpacity>
              </View>
              {loadingStations ? (
                <Text style={styles.muted}>Cargando estaciones…</Text>
              ) : stations.length === 0 ? (
                <Text style={styles.muted}>No has creado estaciones manuales.</Text>
              ) : (
                stations.map((s) => (
                  <View key={s.id} style={styles.stationItem}>
                    <View style={styles.stationRow}>
                      <Text style={styles.stationName}>{s.nom}</Text>
                      <Text style={styles.stationMeta}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.stationMeta}>
                      {s.municipi || 'Sin municipio'} {s.provincia ? `· ${s.provincia}` : ''}
                    </Text>
                    <Text style={styles.stationMeta}>
                      {s.kw ?? 0} kW {s.ac_dc ? `· ${s.ac_dc}` : ''}
                    </Text>
                    <View style={styles.stationActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                          router.push({
                            pathname: '/admin-station-new',
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
                              external_id: s.external_id || '',
                            },
                          })
                        }
                      >
                        <Text style={styles.editButtonText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => setConfirmDeleteId(s.id)}
                      >
                        <Text style={styles.deleteButtonText}>Borrar</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                ))
              )}
            </View>
          </>
        )}
      </View>

      <Modal
        visible={confirmDeleteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteId(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Borrar estacion</Text>
            <Text style={styles.confirmText}>Esta accion no se puede deshacer.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setConfirmDeleteId(null)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={async () => {
                  if (confirmDeleteId !== null) {
                    await deleteStation(confirmDeleteId);
                  }
                  setConfirmDeleteId(null);
                }}
              >
                <Text style={styles.confirmDeleteText}>Borrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 22,
  },
  centered: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  infoBox: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButtonAlt: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  primaryButtonAltText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  stationItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  stationMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  stationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  confirmText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 14,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  confirmCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  confirmDelete: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  confirmDeleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

