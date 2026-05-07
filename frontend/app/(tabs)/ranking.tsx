import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { getApiUrl } from '@/constants/api';

interface RankingUser {
  id: number;
  username: string;
  punts: number;
}

export default function RankingScreen() {
  const router = useRouter();
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);

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
                onPress={() => router.push({ pathname: '/user', params: { userId: item.id } })}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 16,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  topCard: {
    backgroundColor: '#ecfdf5', // Fondo verdecito para el Top 3
    borderColor: '#a7f3d0',
  },
  rankCol: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
  },
  nameCol: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  topUsername: {
    color: '#065f46',
    fontWeight: '700',
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10b981',
  },
  ptsLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
    fontSize: 16,
  },
});