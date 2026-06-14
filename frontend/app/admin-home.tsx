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
import {
  adminPanelScrollBase,
  adminPanelSectionHeaderBase,
  createAdminPanelSharedStyles,
} from '@/constants/adminPanelLayoutStyles';
import type { ScreenTheme } from '@/constants/screenTheme';
import { useScreenTheme } from '@/hooks/use-screen-theme';
import { ManualStationCard } from '@/components/stations/ManualStationCard';
import { ManualStation } from '@/components/stations/types';
import { fetchAdminSession, type AdminSessionPayload } from '@/lib/adminSession';
import { clearPrivilegedSession, getPrivilegedToken, privilegedFetch } from '@/services/privilegedAuth';
import { deleteAdminStation, listAdminStations } from '@/services/stationModeration';

export default function AdminHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useAuth();
  const theme = useScreenTheme();
  const styles = useMemo(() => createAdminStyles(theme), [theme.isDark, theme.sem]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminSessionPayload | null>(null);
  const [error, setError] = useState('');
  const [stations, setStations] = useState<ManualStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      const session = await fetchAdminSession({
        noSession: t('adminHome.noSession'),
        unauthorized: t('adminHome.unauthorized'),
        connectionError: t('adminHome.connectionError'),
      });
      if (!session.ok) {
        setError(session.error);
        setLoading(false);
        return;
      }
      setAdmin(session.admin);
      try {
        await loadMyStations();
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
      setError(t('adminHome.connectionError'));
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
      setError(t('adminHome.connectionError'));
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
              style={styles.primaryButtonAlt}
              onPress={() => router.push('/admin-stations' as Href)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonAltText}>{t('adminHome.manageStations')}</Text>
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

const createAdminStyles = (theme: ScreenTheme) =>
  Object.assign(
    {},
    createAdminPanelSharedStyles(theme),
    StyleSheet.create({
      scroll: {
        ...adminPanelScrollBase,
        justifyContent: 'center',
      },
      title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.title,
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
    color: theme.mutedText,
  },
  infoBox: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.mutedText,
  },
  infoValue: {
    fontSize: 16,
    color: theme.title,
    fontWeight: '600',
  },
  primaryButtonAlt: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.secondaryBtnBg,
    alignItems: 'center',
  },
  primaryButtonAltText: {
    color: theme.secondaryBtnText,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.sem.error,
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
    borderTopColor: theme.border,
    paddingTop: 16,
  },
  sectionHeader: {
    ...adminPanelSectionHeaderBase,
    gap: 8,
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: theme.sem.error,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
    }),
  ) as any;
