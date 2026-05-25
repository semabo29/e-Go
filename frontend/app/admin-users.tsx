import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
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
import { getPrivilegedToken, privilegedFetch } from '@/services/privilegedAuth';
import { AdminUser, listAdminUsers, setUserBanStatus } from '@/services/adminUserModeration';

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useScreenTheme();
  const styles = useMemo(() => createAdminUsersStyles(theme), [theme.isDark, theme.sem]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [confirmBanUser, setConfirmBanUser] = useState<AdminUser | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const idStr = String(u.id);
      const reason = (u.banned_reason || '').toLowerCase();
      return (
        idStr.includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        reason.includes(q)
      );
    });
  }, [users, searchQuery]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const token = await getPrivilegedToken('admin');
      if (!token) {
        setError(t('adminUsers.noSession'));
        return;
      }
      setUsers(await listAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminUsers.loadError'));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await getPrivilegedToken('admin');
        if (!token) {
          setError(t('adminUsers.noSession'));
          return;
        }
        const res = await privilegedFetch('admin', '/admin/me');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('adminUsers.unauthorized'));
          return;
        }
        await loadUsers();
      } catch {
        setError(t('adminUsers.connectionError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUsers]);

  async function handleSetUserBan(user: AdminUser, isBanned: boolean, reason?: string) {
    setLoadingUsers(true);
    try {
      const updated = await setUserBanStatus(
        user.id,
        isBanned,
        isBanned ? reason?.trim() || undefined : undefined
      );
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminUsers.updateError'));
    } finally {
      setLoadingUsers(false);
    }
  }

  function closeBanModal() {
    setConfirmBanUser(null);
    setBanReasonInput('');
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('adminUsers.title')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backText}>{t('adminUsers.backToPanel')}</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primaryBtnBg} />
            <Text style={styles.muted}>{t('adminUsers.loading')}</Text>
          </View>
        ) : error && users.length === 0 ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/admin-login')}>
              <Text style={styles.primaryButtonText}>{t('adminUsers.goLogin')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('adminUsers.list')}</Text>
              <TouchableOpacity onPress={loadUsers} disabled={loadingUsers}>
                <Text style={styles.sectionLink}>
                  {loadingUsers ? t('adminUsers.updating') : t('adminUsers.refresh')}
                </Text>
              </TouchableOpacity>
            </View>
            {users.length > 0 ? (
              <View style={styles.searchBlock}>
                <Text style={styles.searchLabel}>{t('adminUsers.search')}</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('adminUsers.searchPlaceholder')}
                  placeholderTextColor={theme.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  editable={!loadingUsers}
                />
              </View>
            ) : null}
            {loadingUsers && users.length === 0 ? (
              <Text style={styles.muted}>{t('adminUsers.loadingUsers')}</Text>
            ) : users.length === 0 ? (
              <Text style={styles.muted}>{t('adminUsers.empty')}</Text>
            ) : filteredUsers.length === 0 ? (
              <Text style={styles.muted}>{t('adminUsers.noSearchResults')}</Text>
            ) : (
              filteredUsers.map((u) => (
                <View key={u.id} style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.username}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <Text style={u.is_banned ? styles.userStatusBanned : styles.userStatusActive}>
                      {u.is_banned ? t('adminUsers.banned') : t('adminUsers.active')}
                    </Text>
                    {u.is_banned && u.banned_reason ? (
                      <Text style={styles.userBanReason} numberOfLines={3}>
                        {t('adminUsers.banReason', { reason: u.banned_reason })}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={u.is_banned ? styles.unbanButton : styles.banButton}
                    onPress={() => {
                      setBanReasonInput('');
                      setConfirmBanUser(u);
                    }}
                    disabled={loadingUsers}
                  >
                    <Text style={styles.banButtonText}>{u.is_banned ? t('adminUsers.unban') : t('adminUsers.ban')}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </View>

      <Modal visible={!!confirmBanUser} transparent animationType="fade" onRequestClose={closeBanModal}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCardWide}>
            <Text style={styles.confirmTitle}>
              {confirmBanUser?.is_banned ? t('adminUsers.unbanTitle') : t('adminUsers.banTitle')}
            </Text>
            <Text style={styles.confirmText}>
              {confirmBanUser?.is_banned ? t('adminUsers.unbanBody') : t('adminUsers.banBody')}
            </Text>
            {confirmBanUser && !confirmBanUser.is_banned ? (
              <>
                <Text style={styles.banReasonLabel}>{t('adminUsers.banReasonLabel')}</Text>
                <TextInput
                  style={styles.banReasonInput}
                  placeholder={t('adminUsers.banReasonPlaceholder')}
                  placeholderTextColor={theme.placeholder}
                  value={banReasonInput}
                  onChangeText={setBanReasonInput}
                  multiline
                  maxLength={2000}
                  editable={!loadingUsers}
                  textAlignVertical="top"
                />
              </>
            ) : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={closeBanModal}>
                <Text style={styles.confirmCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={confirmBanUser?.is_banned ? styles.confirmUnban : styles.confirmDelete}
                onPress={async () => {
                  if (!confirmBanUser) return;
                  if (!confirmBanUser.is_banned) {
                    const reason = banReasonInput.trim();
                    if (!reason) {
                      Alert.alert(t('adminUsers.reasonRequiredTitle'), t('adminUsers.reasonRequiredBody'));
                      return;
                    }
                    await handleSetUserBan(confirmBanUser, true, reason);
                  } else {
                    await handleSetUserBan(confirmBanUser, false);
                  }
                  closeBanModal();
                }}
                disabled={loadingUsers}
              >
                <Text style={styles.confirmDeleteText}>
                  {confirmBanUser?.is_banned ? t('adminUsers.unban') : t('adminUsers.ban')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createAdminUsersStyles = (theme: ScreenTheme) =>
  createAdminPanelScreenStyles(theme, {
      scroll: adminPanelScrollBase,
      ...createAdminPanelChromeStyleObjects(theme),
      ...createAdminPanelSearchStyleObjects(theme),
      userRow: {
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
      userInfo: {
        flex: 1,
      },
      userName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.title,
      },
      userEmail: {
        fontSize: 13,
        color: theme.mutedText,
        marginTop: 2,
      },
      userStatusActive: {
        fontSize: 12,
        color: theme.sem.mapOk,
        marginTop: 4,
        fontWeight: '600',
      },
      userStatusBanned: {
        fontSize: 12,
        color: theme.sem.error,
        marginTop: 4,
        fontWeight: '600',
      },
      userBanReason: {
        fontSize: 11,
        color: theme.mutedText,
        marginTop: 4,
        lineHeight: 15,
      },
      banButton: {
        backgroundColor: theme.sem.error,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 8,
      },
      unbanButton: {
        backgroundColor: theme.sem.mapOk,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 8,
      },
      banButtonText: {
        color: theme.textOnAccent,
        fontSize: 13,
        fontWeight: '700',
      },
      confirmCardWide: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 20,
      },
      banReasonLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.secondaryText,
        marginBottom: 6,
      },
      banReasonInput: {
        borderWidth: 1,
        borderColor: theme.inputBorder,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: theme.inputText,
        backgroundColor: theme.inputBg,
        minHeight: 100,
        marginBottom: 16,
      },
      confirmDelete: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: theme.sem.error,
        alignItems: 'center',
      },
      confirmDeleteText: {
        color: theme.textOnAccent,
        fontSize: 14,
        fontWeight: '600',
      },
      confirmUnban: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: theme.sem.mapOk,
        alignItems: 'center',
      },
  });
