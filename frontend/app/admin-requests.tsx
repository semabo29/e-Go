import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { StationRequestCard } from '@/components/stations/StationRequestCard';
import { StationRequest } from '@/components/stations/types';
import type { TFunction } from 'i18next';

import { approveRequest, listPendingRequests, rejectRequest } from '@/services/stationModeration';

/** Orden de visualizacion: provincia arriba (tras direccion/municipio); promotor siempre al final. */
const PAYLOAD_DISPLAY_ORDER = [
  'nom',
  'adreca',
  'municipi',
  'provincia',
  'latitud',
  'longitud',
  'kw',
  'ac_dc',
  'tipus_connexio',
  'tipus_velocitat',
  'acces',
] as const;

const HIDDEN_PAYLOAD_KEYS = new Set(['external_id', 'owner_company_id', 'created_by_admin_id']);
const ALL_PAYLOAD_KEYS_IN_ORDER: readonly string[] = [...PAYLOAD_DISPLAY_ORDER, 'promotor'];

function formatSinglePayloadValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    const j = JSON.stringify(v);
    if (j === '{}' || j === '[]') return null;
    return j;
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Lista fija de campos en orden; los que no vengan en el payload se muestran como Vacío. */
function formatPayloadRows(payload: Record<string, unknown> | undefined, t: TFunction): {
  key: string;
  label: string;
  value: string;
  isEmpty: boolean;
}[] {
  const p: Record<string, unknown> =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};

  const rows = ALL_PAYLOAD_KEYS_IN_ORDER.map((key) => {
    const str = formatSinglePayloadValue(p[key]);
    const empty = str === null;
    return {
      key,
      label: t(`adminRequests.payloadFields.${key}`, { defaultValue: key }),
      value: empty ? t('adminRequests.emptyValue') : str,
      isEmpty: empty,
    };
  });

  const standardSet = new Set(ALL_PAYLOAD_KEYS_IN_ORDER);
  const extras = Object.keys(p)
    .filter((k) => !standardSet.has(k) && !HIDDEN_PAYLOAD_KEYS.has(k))
    .sort((a, b) => a.localeCompare(b));
  for (const key of extras) {
    const str = formatSinglePayloadValue(p[key]);
    const empty = str === null;
    rows.push({
      key,
      label: t(`adminRequests.payloadFields.${key}`, { defaultValue: key }),
      value: empty ? t('adminRequests.emptyValue') : str,
      isEmpty: empty,
    });
  }
  return rows;
}

export default function AdminRequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<StationRequest[]>([]);
  const [rejecting, setRejecting] = useState<StationRequest | null>(null);
  const [detailRequest, setDetailRequest] = useState<StationRequest | null>(null);
  const [reason, setReason] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRequests(await listPendingRequests());
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'NO_SESSION'
          ? t('adminRequests.noSession')
          : t('adminRequests.loadError')
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onApprove(id: number) {
    setSubmitting(true);
    try {
      const res = await approveRequest(id);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('adminRequests.approveError'));
        return;
      }
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onReject() {
    if (!rejecting) return;
    setSubmitting(true);
    try {
      const res = await rejectRequest(rejecting.id, reason.trim());
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('adminRequests.rejectError'));
        return;
      }
      setRejecting(null);
      setReason('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('adminRequests.title')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backText}>{t('adminRequests.back')}</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="large" color="#111827" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : requests.length === 0 ? (
          <Text style={styles.muted}>{t('adminRequests.empty')}</Text>
        ) : (
          requests.map((request) => (
            <View key={request.id}>
              <StationRequestCard request={request} showCompany />
              <TouchableOpacity style={styles.detailsButton} onPress={() => setDetailRequest(request)} activeOpacity={0.8}>
                <Text style={styles.detailsButtonText}>{t('adminRequests.viewDetails')}</Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.approve} onPress={() => onApprove(request.id)} disabled={submitting}>
                  <Text style={styles.approveText}>{t('adminRequests.approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reject} onPress={() => setRejecting(request)} disabled={submitting}>
                  <Text style={styles.rejectText}>{t('adminRequests.reject')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
      <Modal visible={!!detailRequest} transparent animationType="fade" onRequestClose={() => setDetailRequest(null)}>
        <View style={styles.overlay}>
          <View style={styles.detailModalCard}>
            <Text style={styles.modalTitle}>
              {t('adminRequests.modalTitle', { id: detailRequest?.id ?? '' })}
            </Text>
            {detailRequest ? (
              <ScrollView style={styles.detailScroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.detailLine}>
                  <Text style={styles.detailKey}>{t('adminRequests.detail.action')}: </Text>
                  {detailRequest.action.toUpperCase()}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailKey}>{t('adminRequests.detail.date')}: </Text>
                  {new Date(detailRequest.created_at).toLocaleString()}
                </Text>
                {typeof detailRequest.station_id === 'number' ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>{t('adminRequests.detail.stationId')}: </Text>
                    {String(detailRequest.station_id)}
                  </Text>
                ) : null}
                <Text style={styles.detailSection}>{t('adminRequests.detail.company')}</Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailKey}>{t('adminRequests.detail.companyId')}: </Text>
                  {String(detailRequest.empresa_id)}
                </Text>
                {detailRequest.empresa_nombre ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>{t('adminRequests.detail.name')}: </Text>
                    {detailRequest.empresa_nombre}
                  </Text>
                ) : null}
                {detailRequest.empresa_email ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>{t('adminRequests.detail.email')}: </Text>
                    {detailRequest.empresa_email}
                  </Text>
                ) : null}
                {detailRequest.empresa_username ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>{t('adminRequests.detail.user')}: </Text>
                    {detailRequest.empresa_username}
                  </Text>
                ) : null}
                <Text style={styles.detailSection}>{t('adminRequests.detail.payload')}</Text>
                {formatPayloadRows(detailRequest.payload, t).map((row) => (
                  <View key={`payload-${row.key}`} style={styles.detailRow}>
                    <Text style={styles.detailFieldLabel}>{row.label}</Text>
                    <Text style={[styles.detailFieldValue, row.isEmpty && styles.detailFieldValueEmpty]}>{row.value}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.detailClose} onPress={() => setDetailRequest(null)}>
              <Text style={styles.detailCloseText}>{t('adminRequests.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('adminRequests.rejectReasonTitle')}</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder={t('adminRequests.rejectPlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancel} onPress={() => setRejecting(null)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reject} onPress={onReject} disabled={submitting}>
                <Text style={styles.rejectText}>{t('adminRequests.sendReject')}</Text>
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
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 40 },
  card: { width: '100%', maxWidth: 620, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 3 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  backButton: { marginBottom: 12, alignSelf: 'center' },
  backText: { color: '#6b7280', fontWeight: '600' },
  detailsButton: {
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  detailsButtonText: { color: '#111827', fontWeight: '600', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  approve: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '700' },
  reject: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center' },
  rejectText: { color: '#b91c1c', fontWeight: '700' },
  cancel: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '700' },
  errorText: { color: '#dc2626', textAlign: 'center' },
  muted: { color: '#6b7280', textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  detailModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  detailScroll: { maxHeight: 420, marginBottom: 12 },
  detailSection: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailLine: { fontSize: 14, color: '#111827', marginBottom: 6 },
  detailKey: { fontWeight: '600', color: '#4b5563' },
  detailRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailFieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  detailFieldValue: { fontSize: 15, color: '#111827' },
  detailFieldValueEmpty: { color: '#9ca3af', fontStyle: 'italic' },
  detailClose: { paddingVertical: 12, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  detailCloseText: { color: '#fff', fontWeight: '700' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  input: { minHeight: 80, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 12, color: '#111827' },
});
