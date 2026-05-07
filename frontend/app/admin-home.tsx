import { useEffect, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { ManualStationCard } from '@/components/stations/ManualStationCard';
import { ManualStation } from '@/components/stations/types';
import { clearPrivilegedSession, getPrivilegedToken, privilegedFetch } from '@/services/privilegedAuth';
import { deleteAdminStation, listAdminStations } from '@/services/stationModeration';
import { AdminUser, listAdminUsers, setUserBanStatus } from '@/services/adminUserModeration';

type AdminPayload = {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export default function AdminHomeScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminPayload | null>(null);
  const [error, setError] = useState('');
  const [stations, setStations] = useState<ManualStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [confirmBanUser, setConfirmBanUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await getPrivilegedToken('admin');
        if (!token) {
          setError('No hay sesion admin');
          return;
        }
        const res = await privilegedFetch('admin', '/admin/me');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'No autorizado');
          return;
        }
        setAdmin(data.admin);
        await loadMyStations();
        await loadUsers();
      } catch (err) {
        setError('No se pudo conectar con el servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logoutAdmin() {
    await clearPrivilegedSession('admin');
    router.replace('/admin-login');
  }

  async function loadMyStations() {
    setLoadingStations(true);
    try {
      setStations(await listAdminStations());
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoadingStations(false);
    }
  }

  async function deleteStation(id: number) {
    const token = await getPrivilegedToken('admin');
    if (!token) {
      setError('No hay sesion admin');
      return;
    }
    setLoadingStations(true);
    try {
      const res = await deleteAdminStation(id);
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

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      setUsers(await listAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleSetUserBan(user: AdminUser, isBanned: boolean) {
    setLoadingUsers(true);
    try {
      const updated = await setUserBanStatus(user.id, isBanned, isBanned ? 'Baneo manual por admin' : '');
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setLoadingUsers(false);
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
              onPress={() => router.push('/admin-station-new' as Href)}
            >
              <Text style={styles.primaryButtonText}>Anadir estacion manual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButtonAlt}
              onPress={() => router.push('/admin-requests' as Href)}
            >
              <Text style={styles.primaryButtonAltText}>Revisar solicitudes pendientes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                (async () => {
                  if (!admin?.email) return;
                  try {
                    const userRes = await privilegedFetch('admin', '/admin/user');
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
              <Text style={styles.primaryButtonText}>Ir a la aplicacion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={logoutAdmin}>
              <Text style={styles.secondaryButtonText}>Cerrar sesion admin</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tus estaciones manuales</Text>
                <TouchableOpacity
                  onPress={loadMyStations}
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
                  <ManualStationCard
                    key={s.id}
                    station={s}
                    onEdit={() =>
                      router.push(({
                        pathname: '/admin-station-new' as Href,
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
                      }) as Href)
                    }
                    onDelete={() => setConfirmDeleteId(s.id)}
                  />
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Usuarios</Text>
                <TouchableOpacity onPress={loadUsers} disabled={loadingUsers}>
                  <Text style={styles.sectionLink}>{loadingUsers ? 'Actualizando…' : 'Actualizar'}</Text>
                </TouchableOpacity>
              </View>
              {loadingUsers ? (
                <Text style={styles.muted}>Cargando usuarios…</Text>
              ) : users.length === 0 ? (
                <Text style={styles.muted}>No hay usuarios para mostrar.</Text>
              ) : (
                users.map((u) => (
                  <View key={u.id} style={styles.userRow}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.username}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                      <Text style={u.is_banned ? styles.userStatusBanned : styles.userStatusActive}>
                        {u.is_banned ? 'Baneado' : 'Activo'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={u.is_banned ? styles.unbanButton : styles.banButton}
                      onPress={() => setConfirmBanUser(u)}
                      disabled={loadingUsers}
                    >
                      <Text style={styles.banButtonText}>{u.is_banned ? 'Desbanear' : 'Banear'}</Text>
                    </TouchableOpacity>
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

      <Modal
        visible={!!confirmBanUser}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmBanUser(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              {confirmBanUser?.is_banned ? 'Desbanear usuario' : 'Banear usuario'}
            </Text>
            <Text style={styles.confirmText}>
              {confirmBanUser?.is_banned
                ? 'El usuario recuperara acceso a su cuenta.'
                : 'El usuario perdera acceso inmediato a su cuenta.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmBanUser(null)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={confirmBanUser?.is_banned ? styles.confirmUnban : styles.confirmDelete}
                onPress={async () => {
                  if (confirmBanUser) {
                    await handleSetUserBan(confirmBanUser, !confirmBanUser.is_banned);
                  }
                  setConfirmBanUser(null);
                }}
              >
                <Text style={styles.confirmDeleteText}>
                  {confirmBanUser?.is_banned ? 'Desbanear' : 'Banear'}
                </Text>
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
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  userRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  userStatusActive: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 4,
    fontWeight: '600',
  },
  userStatusBanned: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
    fontWeight: '600',
  },
  banButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  unbanButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  banButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmUnban: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
});
