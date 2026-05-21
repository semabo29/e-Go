import { useEffect, useMemo, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { ManualStationCard } from '@/components/stations/ManualStationCard';
import { ManualStation } from '@/components/stations/types';
import { clearPrivilegedSession, getPrivilegedToken, privilegedFetch } from '@/services/privilegedAuth';
import { deleteAdminStation, listAdminStations } from '@/services/stationModeration';

type AdminPayload = {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export default function AdminHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useAuth();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createAdminStyles(sem), [sem]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminPayload | null>(null);
  const [error, setError] = useState('');
  const [stations, setStations] = useState<ManualStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await getPrivilegedToken('admin');
        if (!token) {
          setError(t('adminHome.noSession'));
          return;
        }
        const res = await privilegedFetch('admin', '/admin/me');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('adminHome.unauthorized'));
          return;
        }
        setAdmin(data.admin);
        await loadMyStations();
      } catch (err) {
        setError(t('adminHome.connectionError'));
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
      setError(t('adminHome.noSession'));
      return;
    }
    setLoadingStations(true);
    try {
      const res = await deleteAdminStation(id);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('adminHome.deleteStationError'));
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
        <Text style={styles.title}>{t('adminHome.title')}</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.muted}>{t('adminHome.verifying')}</Text>
          </View>
        ) : error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/admin-login')}>
              <Text style={styles.primaryButtonText}>{t('adminHome.backLogin')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t('adminHome.email')}</Text>
              <Text style={styles.infoValue}>{admin?.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/admin-station-new' as Href)}
            >
              <Text style={styles.primaryButtonText}>{t('adminHome.addStation')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButtonAlt}
              onPress={() => router.push('/admin-requests' as Href)}
            >
              <Text style={styles.primaryButtonAltText}>{t('adminHome.reviewRequests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButtonAlt}
              onPress={() => router.push('/admin-users' as Href)}
              accessibilityRole="button"
              accessibilityLabel={t('adminHome.userModerationA11y')}
            >
              <Text style={styles.primaryButtonAltText}>{t('adminHome.userModeration')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButtonAlt}
              onPress={() => router.push('/admin-incidencias' as Href)}
              accessibilityRole="button"
              accessibilityLabel={t('adminHome.pendingIncidentsA11y')}
            >
              <Text style={styles.primaryButtonAltText}>{t('adminHome.pendingIncidents')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButtonAlt}
              onPress={() => router.push('/admin-incidencias-history' as Href)}
              accessibilityRole="button"
              accessibilityLabel={t('adminHome.incidentHistoryA11y')}
            >
              <Text style={styles.primaryButtonAltText}>{t('adminHome.incidentHistory')}</Text>
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
                      setError(userData.error || t('adminHome.loadUserError'));
                      return;
                    }
                    setUser(userData.user);
                    router.replace('/(tabs)');
                  } catch (err) {
                    setError(t('adminHome.connectionError'));
                  }
                })();
              }}
            >
              <Text style={styles.primaryButtonText}>{t('adminHome.goToApp')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={logoutAdmin}>
              <Text style={styles.secondaryButtonText}>{t('adminHome.logout')}</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('adminHome.manualStations')}</Text>
                <TouchableOpacity
                  onPress={loadMyStations}
                  disabled={loadingStations}
                >
                  <Text style={styles.sectionLink}>
                    {loadingStations ? t('adminHome.updating') : t('adminHome.refresh')}
                  </Text>
                </TouchableOpacity>
              </View>
              {loadingStations ? (
                <Text style={styles.muted}>{t('adminHome.loadingStations')}</Text>
              ) : stations.length === 0 ? (
                <Text style={styles.muted}>{t('adminHome.noManualStations')}</Text>
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
            <Text style={styles.confirmTitle}>{t('adminHome.deleteStationTitle')}</Text>
            <Text style={styles.confirmText}>{t('adminHome.deleteStationBody')}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setConfirmDeleteId(null)}
              >
                <Text style={styles.confirmCancelText}>{t('common.cancel')}</Text>
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
                <Text style={styles.confirmDeleteText}>{t('adminHome.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createAdminStyles = (sem: SemanticColors) => StyleSheet.create({
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
    backgroundColor: sem.error,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
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
    backgroundColor: sem.error,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
