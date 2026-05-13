import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { getApiUrl } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface RankingUser {
  id: number;
  username: string;
  punts: number;
}

export default function RankingScreen() {
  const colorScheme = useColorScheme();
  const themeIndex = colorScheme === 'dark' ? 1 : 0;
  const pick = (values: [string, string]) => values[themeIndex];
  const router = useRouter();
  const [ranking, setRanking] = useState<RankingUser[]>([]);
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
    topUsername: pick(['#065f46', '#6ee7b7']),
    points: '#10b981',
    ptsLabel: pick(['#64748b', '#94a3b8']),
    empty: pick(['#94a3b8', '#94a3b8']),
    rankNumber: pick(['#94a3b8', '#cbd5e1']),
    topCardBg: pick(['#ecfdf5', '#052e16']),
    topCardBorder: pick(['#a7f3d0', '#14532d']),
    accent: '#10b981',
  };
  const styles = useMemo(() => createStyles(theme), [colorScheme]);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/ranking`);
      const data = await response.json();
      setRanking(data);
    } catch (error) {
      console.error('Error cargando ranking:', error);
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
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Cargando líderes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="emoji-events" size={32} color="#10b981" />
        <Text style={styles.title}>Ranking e-Go</Text>
        <Text style={styles.subtitle}>Los conductores más sostenibles</Text>
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
                  {item.username || 'Usuario Anónimo'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pointsCol}>
              <Text style={styles.points}>{item.punts}</Text>
              <Text style={styles.ptsLabel}>pts</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aún no hay puntuaciones.</Text>
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
    padding: 24,
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.title,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.subtitle,
    marginTop: 4,
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