import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  status: 'pending' | 'approved' | 'rejected';
};

export function StationRequestStatusBadge({ status }: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.badge, status === 'approved' ? styles.approved : status === 'rejected' ? styles.rejected : styles.pending]}>
      <Text style={styles.text}>{t(`stationRequest.status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pending: { backgroundColor: '#fef3c7' },
  approved: { backgroundColor: '#dcfce7' },
  rejected: { backgroundColor: '#fee2e2' },
  text: { fontSize: 12, fontWeight: '700', color: '#1f2937' },
});
