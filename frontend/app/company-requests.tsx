import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Href, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { StationRequestCard } from '@/components/stations/StationRequestCard';
import { StationRequest } from '@/components/stations/types';
import { listCompanyRequests } from '@/services/stationModeration';

export default function CompanyRequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<StationRequest[]>([]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRequests(await listCompanyRequests());
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'NO_SESSION'
          ? t('companyRequests.noSession')
          : t('companyRequests.loadError')
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('companyRequests.title')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/company-home' as Href)}>
          <Text style={styles.backText}>{t('companyRequests.backToPanel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshButton} onPress={load} disabled={loading}>
          <Text style={styles.refreshText}>
            {loading ? t('companyRequests.updating') : t('companyRequests.refresh')}
          </Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="large" color="#111827" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : requests.length === 0 ? (
          <Text style={styles.muted}>{t('companyRequests.empty')}</Text>
        ) : (
          requests.map((request) => <StationRequestCard key={request.id} request={request} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 40 },
  card: { width: '100%', maxWidth: 560, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 3 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  backButton: { marginBottom: 10, alignSelf: 'center' },
  backText: { color: '#6b7280', fontWeight: '600' },
  refreshButton: { marginBottom: 16, alignSelf: 'center' },
  refreshText: { color: '#111827', fontWeight: '700' },
  errorText: { color: '#dc2626', textAlign: 'center' },
  muted: { color: '#6b7280', textAlign: 'center' },
});
