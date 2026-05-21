import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ManualStation } from '@/components/stations/types';

type Props = {
  station: ManualStation;
  onEdit: () => void;
  onDelete: () => void;
};

export function ManualStationCard({ station, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.stationItem}>
      <View style={styles.stationRow}>
        <Text style={styles.stationName}>{station.nom}</Text>
        <Text style={styles.stationMeta}>{new Date(station.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.stationMeta}>
        {station.municipi || t('stationCard.noMunicipality')} {station.provincia ? `· ${station.provincia}` : ''}
      </Text>
      <Text style={styles.stationMeta}>
        {station.kw ?? 0} kW {station.ac_dc ? `· ${station.ac_dc}` : ''}
      </Text>
      <View style={styles.stationActions}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>{t('stationCard.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>{t('stationCard.delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stationItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  stationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 6,
  },
  stationName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  stationMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  stationActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  editButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  deleteButtonText: { color: '#b91c1c', fontSize: 14, fontWeight: '600' },
});
