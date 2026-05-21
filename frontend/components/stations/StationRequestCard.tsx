import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { StationRequest } from '@/components/stations/types';
import { StationRequestStatusBadge } from '@/components/stations/StationRequestStatusBadge';

type Props = {
  request: StationRequest;
  showCompany?: boolean;
};

export function StationRequestCard({ request, showCompany = false }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{t('stationRequest.title', { id: request.id })}</Text>
        <StationRequestStatusBadge status={request.status} />
      </View>
      <Text style={styles.meta}>{t('stationRequest.action', { action: request.action.toUpperCase() })}</Text>
      <Text style={styles.meta}>
        {t('stationRequest.date', { date: new Date(request.created_at).toLocaleString() })}
      </Text>
      {showCompany && request.empresa_nombre ? (
        <Text style={styles.meta}>{t('stationRequest.company', { name: request.empresa_nombre })}</Text>
      ) : null}
      {request.rejection_reason ? (
        <Text style={styles.reason}>{t('stationRequest.reason', { reason: request.rejection_reason })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  reason: { fontSize: 13, color: '#991b1b', marginTop: 8, fontWeight: '600' },
});
