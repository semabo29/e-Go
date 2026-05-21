import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getPrivilegedToken, privilegedFetch } from '@/services/privilegedAuth';
import { AdminUser, listAdminUsers, setUserBanStatus } from '@/services/adminUserModeration';

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
            <ActivityIndicator size="large" color="#111827" />
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
                  placeholderTextColor="#9ca3af"
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
                  placeholderTextColor="#9ca3af"
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingVertical: 40,
    alignItems: 'center',
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
    marginBottom: 10,
  },
  backButton: {
    marginBottom: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  centered: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
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
  searchBlock: {
    marginBottom: 14,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
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
  userBanReason: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 15,
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
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCardWide: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  banReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  banReasonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    marginBottom: 16,
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
