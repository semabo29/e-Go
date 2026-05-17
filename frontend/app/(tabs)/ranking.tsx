import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { getApiUrl } from '@/constants/api';
import { getSemanticColors } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface RankingUser {
  id: number;
  username: string;
  punts: number;
}

export default function RankingScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { colorblindFriendly } = useColorblindPreference();
  const { user } = useAuth();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const themeIndex = colorScheme === 'dark' ? 1 : 0;
  const pick = (values: [string, string]) => values[themeIndex];
  const router = useRouter();
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [isGlobalRanking, setIsGlobalRanking] = useState(true);
  const [loading, setLoading] = useState(true);
  const theme = {
    background: pick(['#f8fafc', '#0f172a']),
    surface: pick(['#ffffff', '#1e293b']),
    border: pick(['#e2e8f0', '#334155']),
    cardBorder: pick(['#f1f5f9', '#334155']),
    title: pick(['#1f2937', '#f1f5f9']),
    subtitle: pick(['#64748b', '#94a3b8']),
    loading: pick(['#64748b', '#94a3b8']),
    username: pick(['#334155', '#e2e8f0']),
    topUsername: colorblindFriendly
      ? sem.chipActiveText
      : pick(['#065f46', '#6ee7b7']),
    points: sem.accent,
    ptsLabel: pick(['#64748b', '#94a3b8']),
    empty: pick(['#94a3b8', '#94a3b8']),
    rankNumber: pick(['#94a3b8', '#cbd5e1']),
    topCardBg: colorblindFriendly ? sem.chipActiveBg : pick(['#ecfdf5', '#052e16']),
    topCardBorder: colorblindFriendly ? sem.accent : pick(['#a7f3d0', '#14532d']),
  };
  const styles = useMemo(() => createStyles(theme), [colorScheme, colorblindFriendly]);

  useEffect(() => {
    if (isGlobalRanking) {
      fetchGlobalRanking();
    } else {
      fetchFriendsRanking();
    }
  }, [isGlobalRanking]);

  const fetchGlobalRanking = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/ranking`);
      const data = await response.json();
      setRanking(data);
    } catch (error) {
      console.error('Error cargando ranking global:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendsRanking = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/ranking/friends?usuari_id=${user.id}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setRanking(data);
      } else {
        setRanking([]);
      }
    } catch (error) {
      console.error('Error cargando ranking de amigos:', error);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  const renderMedal = (index: number) => {
    if (index === 0) return <MaterialIcons name="emoji-events" size={28} color="#fbbf24" />; // Oro
    if (index === 1) return <MaterialIcons name="emoji-events" size={28} color="#94a3b8" />; // Plata
    if (index === 2) return <MaterialIcons name="emoji-events" size={28} color="#b45309" />; // Bronce
    return <Text style={styles.rankNumber}>{index + 1}</Text>; // Resto
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator testID="ranking-loading-indicator" size="large" color={sem.accent} />
        <Text style={styles.loadingText}>{t('ranking.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="ranking-screen-root">
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="emoji-events" size={32} color={sem.accent} />
            <View style={styles.titleText}>
              <Text style={styles.title}>{t('ranking.title')}</Text>
              <Text style={styles.subtitle}>
                {isGlobalRanking ? 'Los conductores más sostenibles' : 'Tus amigos'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.tabButton, isGlobalRanking && styles.tabButtonActive]}
            onPress={() => setIsGlobalRanking(!isGlobalRanking)}
          >
            <MaterialIcons
              name={isGlobalRanking ? 'public' : 'group'}
              size={20}
              color={isGlobalRanking ? '#fff' : theme.title}
            />
            <Text style={[styles.tabButtonText, isGlobalRanking && styles.tabButtonTextActive]}>
              {isGlobalRanking ? 'Global' : 'Amigos'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={ranking}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={[styles.card, index < 3 && styles.topCard]}>
            <View style={styles.rankCol}>
              {renderMedal(index)}
            </View>
            
            <View style={styles.nameCol}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '../user', params: { userId: item.id } })}
                activeOpacity={0.7}
              >
                <Text style={[styles.username, index < 3 && styles.topUsername]}>
                  {item.username || t('ranking.anonymousUser')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pointsCol}>
              <Text style={styles.points}>{item.punts}</Text>
              <Text style={styles.ptsLabel}>{t('ranking.pts')}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isGlobalRanking ? 'Aún no hay puntuaciones.' : 'No tienes amigos aún o no hay puntuaciones entre tus amigos.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: {
  background: string;
  surface: string;
  border: string;
  cardBorder: string;
  title: string;
  subtitle: string;
  loading: string;
  username: string;
  topUsername: string;
  points: string;
  ptsLabel: string;
  empty: string;
  rankNumber: string;
  topCardBg: string;
  topCardBorder: string;
}) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.loading,
    fontSize: 16,
  },
  header: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingRight: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.title,
  },
  subtitle: {
    fontSize: 14,
    color: theme.subtitle,
    marginTop: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.border,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.title,
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  topCard: {
    backgroundColor: theme.topCardBg,
    borderColor: theme.topCardBorder,
  },
  rankCol: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.rankNumber,
  },
  nameCol: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.username,
  },
  topUsername: {
    color: theme.topUsername,
    fontWeight: '700',
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.points,
  },
  ptsLabel: {
    fontSize: 12,
    color: theme.ptsLabel,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.empty,
    marginTop: 40,
    fontSize: 16,
  },
});