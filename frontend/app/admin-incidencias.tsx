import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  type Incidencia,
  listPendingIncidencias,
  listHistoryIncidencias,
  validateIncidencia,
  rejectIncidencia,
  resolveIncidencia,
} from '@/services/incidenciaAdminService';
import {
  incidentStatusColor,
  incidentStatusLabel,
  incidentTypeLabel,
  TIPUS_COLORS,
  TIPUS_TEXT_COLORS,
} from '@/utils/adminIncidentUi';

type IncidenciaCardProps = {
  inc: Incidencia;
  onValidate: () => void;
  onReject: () => void;
  onResolve: () => void;
  onDetails: () => void;
  submitting: boolean;
};

function IncidenciaCard({ inc, onValidate, onReject, onResolve, onDetails, submitting }: IncidenciaCardProps) {
  const { t } = useTranslation();
  const canValidate = !inc.validada && !inc.rebutjada;
  const canReject = !inc.validada && !inc.rebutjada && !inc.resolta;
  const canResolve = inc.validada && !inc.resolta && !inc.rebutjada;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: TIPUS_COLORS[inc.tipus] ?? '#f3f4f6' }]}>
          <Text style={[styles.typeBadgeText, { color: TIPUS_TEXT_COLORS[inc.tipus] ?? '#374151' }]}>
            {incidentTypeLabel(inc.tipus, t)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: incidentStatusColor(inc) }]}>
          <Text style={styles.statusBadgeText}>{incidentStatusLabel(inc, t)}</Text>
        </View>
      </View>

      <Text style={styles.stationName}>
        {inc.estacio_nom ?? t('adminIncidents.stationFallback', { id: inc.estacio })}
        {inc.estacio_municipi ? ` · ${inc.estacio_municipi}` : ''}
      </Text>
      <Text style={styles.meta}>
        {inc.conductor_username} · {new Date(inc.data_inici).toLocaleString()}
      </Text>
      <Text style={styles.comment} numberOfLines={2}>
        {inc.comentari}
      </Text>

      <TouchableOpacity style={styles.detailBtn} onPress={onDetails}>
        <Text style={styles.detailBtnText}>{t('adminIncidents.viewDetails')}</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        {canValidate && (
          <TouchableOpacity style={styles.btnValidate} onPress={onValidate} disabled={submitting}>
            <Text style={styles.btnValidateText}>{t('adminIncidents.validate')}</Text>
          </TouchableOpacity>
        )}
        {canReject && (
          <TouchableOpacity style={styles.btnReject} onPress={onReject} disabled={submitting}>
            <Text style={styles.btnRejectText}>{t('adminIncidents.reject')}</Text>
          </TouchableOpacity>
        )}
        {canResolve && (
          <TouchableOpacity style={styles.btnResolve} onPress={onResolve} disabled={submitting}>
            <Text style={styles.btnResolveText}>{t('adminIncidents.markResolved')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

type RowProps = { label: string; value: string };

function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function AdminIncidenciasScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Incidencia[]>([]);
  const [validated, setValidated] = useState<Incidencia[]>([]);
  const [detailInc, setDetailInc] = useState<Incidencia | null>(null);
  const [rejectingInc, setRejectingInc] = useState<Incidencia | null>(null);
  const [rejectMotiu, setRejectMotiu] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [pend, val] = await Promise.all([
        listPendingIncidencias(),
        listHistoryIncidencias({ estado: 'validated', limit: 50, offset: 0 }),
      ]);
      setPending(pend);
      setValidated(val);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminIncidents.loadError'));
    } finally {
      setLoading(false);
    }
  }

  function renderSection(list: Incidencia[], emptyText: string) {
    if (list.length === 0) return <Text style={styles.muted}>{emptyText}</Text>;
    return list.map((inc) => (
      <IncidenciaCard
        key={inc.id}
        inc={inc}
        onValidate={() => handleValidate(inc.id)}
        onReject={() => {
          setRejectingInc(inc);
          setRejectMotiu('');
        }}
        onResolve={() => handleResolve(inc.id)}
        onDetails={() => setDetailInc(inc)}
        submitting={submitting}
      />
    ));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleValidate(id: number) {
    setSubmitting(true);
    try {
      const result = await validateIncidencia(id);
      const pts = result.pointsAwarded;
      const premium = pts?.isPremium ? t('adminIncidents.alerts.premiumSuffix') : '';
      const msg = pts
        ? t('adminIncidents.alerts.validatedWithPoints', {
            points: pts.points,
            premium,
          })
        : t('adminIncidents.alerts.validatedSimple');
      Alert.alert(t('adminIncidents.alerts.validatedTitle'), msg);
      await load();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('adminIncidents.alerts.validateError')
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectingInc) return;
    setSubmitting(true);
    try {
      await rejectIncidencia(rejectingInc.id, rejectMotiu.trim() || undefined);
      Alert.alert(t('adminIncidents.alerts.rejectedTitle'), t('adminIncidents.alerts.rejectedBody'));
      setRejectingInc(null);
      setRejectMotiu('');
      await load();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('adminIncidents.alerts.rejectError')
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(id: number) {
    setSubmitting(true);
    try {
      await resolveIncidencia(id);
      Alert.alert(t('adminIncidents.alerts.resolvedTitle'), t('adminIncidents.alerts.resolvedBody'));
      await load();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('adminIncidents.alerts.resolveError')
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('adminIncidents.title')}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backBtnText}>{t('adminIncidents.backToPanel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} disabled={loading}>
          <Text style={styles.refreshBtnText}>
            {loading ? t('adminIncidents.loading') : t('adminIncidents.refresh')}
          </Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color="#111827" style={{ marginTop: 24 }} />}
        {!loading && error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.sectionTitle}>{t('adminIncidents.sectionPending')}</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{pending.length}</Text>
              </View>
            </View>
            {renderSection(pending, t('adminIncidents.emptyPending'))}

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <View style={[styles.sectionDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.sectionTitle}>{t('adminIncidents.sectionValidated')}</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.sectionBadgeText, { color: '#1d4ed8' }]}>{validated.length}</Text>
              </View>
            </View>
            {renderSection(validated, t('adminIncidents.emptyValidated'))}
          </>
        )}
      </View>

      <Modal visible={!!detailInc} transparent animationType="fade" onRequestClose={() => setDetailInc(null)}>
        <View style={styles.overlay}>
          <View style={styles.detailCard}>
            <Text style={styles.modalTitle}>
              {t('adminIncidents.modalTitle', { id: detailInc?.id })}
            </Text>
            {detailInc && (
              <ScrollView style={styles.detailScroll}>
                <Row label={t('adminIncidents.fields.type')} value={incidentTypeLabel(detailInc.tipus, t)} />
                <Row label={t('adminIncidents.fields.status')} value={incidentStatusLabel(detailInc, t)} />
                <Row
                  label={t('adminIncidents.fields.station')}
                  value={detailInc.estacio_nom ?? `#${detailInc.estacio}`}
                />
                {detailInc.estacio_municipi ? (
                  <Row label={t('adminIncidents.fields.municipality')} value={detailInc.estacio_municipi} />
                ) : null}
                <Row label={t('adminIncidents.fields.driver')} value={detailInc.conductor_username} />
                <Row label={t('adminIncidents.fields.email')} value={detailInc.conductor_email} />
                <Row
                  label={t('adminIncidents.fields.reportDate')}
                  value={new Date(detailInc.data_inici).toLocaleString()}
                />
                <Row label={t('adminIncidents.fields.comment')} value={detailInc.comentari} />
                {detailInc.motiu_rebuig ? (
                  <Row label={t('adminIncidents.fields.rejectReason')} value={detailInc.motiu_rebuig} />
                ) : null}
                {detailInc.data_validacio ? (
                  <Row
                    label={t('adminIncidents.fields.validationDate')}
                    value={new Date(detailInc.data_validacio).toLocaleString()}
                  />
                ) : null}
                {detailInc.data_resolucio ? (
                  <Row
                    label={t('adminIncidents.fields.resolutionDate')}
                    value={new Date(detailInc.data_resolucio).toLocaleString()}
                  />
                ) : null}
                {detailInc.data_rebuig ? (
                  <Row
                    label={t('adminIncidents.fields.rejectionDate')}
                    value={new Date(detailInc.data_rebuig).toLocaleString()}
                  />
                ) : null}
                {detailInc.arxiu ? (
                  <View style={styles.imageContainer}>
                    <Text style={styles.rowLabel}>{t('adminIncidents.fields.attachedImage')}</Text>
                    <Image source={{ uri: detailInc.arxiu }} style={styles.image} resizeMode="contain" />
                  </View>
                ) : null}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailInc(null)}>
              <Text style={styles.closeBtnText}>{t('adminIncidents.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!rejectingInc}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingInc(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t('adminIncidents.rejectModalTitle', { id: rejectingInc?.id })}
            </Text>
            <TextInput
              style={styles.input}
              value={rejectMotiu}
              onChangeText={setRejectMotiu}
              placeholder={t('adminIncidents.rejectPlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectingInc(null)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnReject} onPress={handleReject} disabled={submitting}>
                <Text style={styles.btnRejectText}>{t('adminIncidents.reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, alignItems: 'center', padding: 16, paddingVertical: 32 },
  container: { width: '100%', maxWidth: 640 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  backBtn: { alignSelf: 'center', marginBottom: 6 },
  backBtnText: { color: '#6b7280', fontWeight: '600' },
  refreshBtn: { alignSelf: 'center', marginBottom: 16 },
  refreshBtnText: { color: '#111827', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#dc2626', textAlign: 'center', marginTop: 16 },
  muted: { color: '#6b7280', textAlign: 'center', marginVertical: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  sectionBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stationName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  comment: { fontSize: 13, color: '#374151', marginBottom: 10 },
  detailBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  detailBtnText: { color: '#111827', fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnValidate: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  btnValidateText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnReject: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  btnRejectText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  btnResolve: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
  },
  btnResolveText: { color: '#166534', fontWeight: '700', fontSize: 13 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailCard: { width: '100%', maxWidth: 440, maxHeight: '88%', backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  detailScroll: { maxHeight: 420, marginBottom: 12 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  row: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
  rowValue: { fontSize: 14, color: '#111827' },
  imageContainer: { marginBottom: 10 },
  image: { width: '100%', height: 180, borderRadius: 8, marginTop: 6 },
  closeBtn: { paddingVertical: 12, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '700' },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    color: '#111827',
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { color: '#111827', fontWeight: '700' },
});
