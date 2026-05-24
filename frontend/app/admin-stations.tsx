import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  adminPanelScrollBase,
  createAdminPanelChromeStyleObjects,
  createAdminPanelScreenStyles,
  createAdminPanelSearchStyleObjects,
} from '@/constants/adminPanelLayoutStyles';
import type { ScreenTheme } from '@/constants/screenTheme';
import { useScreenTheme } from '@/hooks/use-screen-theme';
import { fetchAdminSession } from '@/lib/adminSession';
import {
  AdminStationSummary,
  listAllAdminStations,
  setStationOperatiu,
} from '@/services/stationModeration';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export default function AdminStationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useScreenTheme();
  const styles = useMemo(() => createAdminStationsStyles(theme), [theme.isDark, theme.sem]);

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [stations, setStations] = useState<AdminStationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQueryRef = useRef('');

  const [confirmStation, setConfirmStation] = useState<AdminStationSummary | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async (q: string, newOffset: number, replace: boolean) => {
    setLoading(true);
    setLoadError('');
    try {
      const { stations: page, hasMore: more } = await listAllAdminStations(q, newOffset);
      setHasMore(more);
      setOffset(newOffset);
      setStations((prev) => (replace ? page : [...prev, ...page]));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('adminStations.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    (async () => {
      setAuthLoading(true);
      setAuthError('');
      const session = await fetchAdminSession({
        noSession: t('adminStations.noSession'),
        unauthorized: t('adminStations.unauthorized'),
        connectionError: t('adminStations.connectionError'),
      });
      if (!session.ok) {
        setAuthError(session.error);
        setAuthLoading(false);
        return;
      }
      try {
        await load('', 0, true);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [load, t]);

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      activeQueryRef.current = text.trim();
      load(text.trim(), 0, true);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleLoadMore() {
    load(activeQueryRef.current, offset + PAGE_SIZE, false);
  }

  async function handleToggleOperatiu(station: AdminStationSummary) {
    setToggling(true);
    try {
      const updated = await setStationOperatiu(station.id, !station.operatiu);
      setStations((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('adminStations.updateError'));
    } finally {
      setToggling(false);
    }
  }

  if (authLoading) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('adminStations.title')}</Text>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primaryBtnBg} />
            <Text style={styles.muted}>{t('adminStations.loading')}</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (authError) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('adminStations.title')}</Text>
          <Text style={styles.errorText}>{authError}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/admin-login')}>
            <Text style={styles.primaryButtonText}>{t('adminStations.goLogin')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('adminStations.title')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backText}>{t('adminStations.backToPanel')}</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('adminStations.list')}</Text>
          <TouchableOpacity onPress={() => load(activeQueryRef.current, 0, true)} disabled={loading}>
            <Text style={styles.sectionLink}>
              {loading ? t('adminStations.updating') : t('adminStations.refresh')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBlock}>
          <Text style={styles.searchLabel}>{t('adminStations.search')}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('adminStations.searchPlaceholder')}
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            editable={!loading}
          />
        </View>

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {loading && stations.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primaryBtnBg} />
          </View>
        ) : stations.length === 0 ? (
          <Text style={styles.muted}>
            {searchQuery.trim() ? t('adminStations.noSearchResults') : t('adminStations.empty')}
          </Text>
        ) : (
          <>
            {stations.map((s) => (
              <View key={s.id} style={styles.stationRow}>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{s.nom}</Text>
                  {(s.municipi || s.provincia) ? (
                    <Text style={styles.stationLocation}>
                      {[s.municipi, s.provincia].filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                  {s.kw ? (
                    <Text style={styles.stationMeta}>{s.kw} kW{s.ac_dc ? ` · ${s.ac_dc}` : ''}</Text>
                  ) : null}
                  <Text style={s.operatiu ? styles.statusOperative : styles.statusNonOperative}>
                    {s.operatiu ? t('adminStations.operative') : t('adminStations.nonOperative')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.operatiu ? styles.disableButton : styles.enableButton}
                  onPress={() => setConfirmStation(s)}
                  disabled={toggling || loading}
                >
                  <Text style={styles.actionButtonText}>
                    {s.operatiu ? t('adminStations.markNonOperative') : t('adminStations.reactivate')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loading}
              >
                <Text style={styles.loadMoreButtonText}>
                  {loading ? t('adminStations.updating') : t('adminStations.loadMore')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>

      <Modal
        visible={!!confirmStation}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmStation(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              {confirmStation?.operatiu
                ? t('adminStations.confirmDisableTitle')
                : t('adminStations.confirmEnableTitle')}
            </Text>
            <Text style={styles.confirmText}>
              {confirmStation?.operatiu
                ? t('adminStations.confirmDisableBody')
                : t('adminStations.confirmEnableBody')}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmStation(null)}>
                <Text style={styles.confirmCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={confirmStation?.operatiu ? styles.confirmDisable : styles.confirmEnable}
                onPress={async () => {
                  if (!confirmStation) return;
                  await handleToggleOperatiu(confirmStation);
                  setConfirmStation(null);
                }}
                disabled={toggling}
              >
                <Text style={styles.confirmActionText}>
                  {confirmStation?.operatiu ? t('adminStations.markNonOperative') : t('adminStations.reactivate')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createAdminStationsStyles = (theme: ScreenTheme) => {
  const chrome = createAdminPanelChromeStyleObjects(theme);
  return createAdminPanelScreenStyles(theme, {
      scroll: adminPanelScrollBase,
      ...chrome,
      muted: { ...chrome.muted, textAlign: 'center' as const, marginTop: 8 },
      ...createAdminPanelSearchStyleObjects(theme),
      stationRow: {
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      },
      stationInfo: {
        flex: 1,
      },
      stationName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.title,
      },
      stationLocation: {
        fontSize: 13,
        color: theme.mutedText,
        marginTop: 2,
      },
      stationMeta: {
        fontSize: 12,
        color: theme.placeholder,
        marginTop: 2,
      },
      statusOperative: {
        fontSize: 12,
        color: theme.sem.mapOk,
        marginTop: 4,
        fontWeight: '600',
      },
      statusNonOperative: {
        fontSize: 12,
        color: theme.sem.error,
        marginTop: 4,
        fontWeight: '600',
      },
      disableButton: {
        backgroundColor: theme.sem.error,
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignItems: 'center',
        maxWidth: 110,
      },
      enableButton: {
        backgroundColor: theme.sem.mapOk,
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignItems: 'center',
        maxWidth: 110,
      },
      actionButtonText: {
        color: theme.textOnAccent,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
      },
      loadMoreButton: {
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: theme.secondaryBtnBg,
        alignItems: 'center',
        marginTop: 4,
      },
      loadMoreButtonText: {
        color: theme.secondaryBtnText,
        fontWeight: '700',
        fontSize: 14,
      },
      confirmDisable: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: theme.sem.error,
        alignItems: 'center',
      },
      confirmEnable: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: theme.sem.mapOk,
        alignItems: 'center',
      },
      confirmActionText: {
        color: theme.textOnAccent,
        fontSize: 14,
        fontWeight: '600',
      },
  });
};
