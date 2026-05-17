import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { StationRequestCard } from '@/components/stations/StationRequestCard';
import { StationRequest } from '@/components/stations/types';
import { approveRequest, listPendingRequests, rejectRequest } from '@/services/stationModeration';

const PAYLOAD_FIELD_LABELS: Record<string, string> = {
  nom: 'Nombre',
  latitud: 'Latitud',
  longitud: 'Longitud',
  kw: 'Potencia (kW)',
  ac_dc: 'AC/DC',
  tipus_connexio: 'Tipo de conexion',
  tipus_velocitat: 'Tipo de velocidad',
  adreca: 'Direccion',
  municipi: 'Municipio',
  provincia: 'Provincia',
  promotor: 'Promotor/gestor',
  acces: 'Acceso',
};

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
function formatPayloadRows(payload: Record<string, unknown> | undefined): {
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
      label: PAYLOAD_FIELD_LABELS[key] ?? key,
      value: empty ? 'Vacío' : str,
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
      label: PAYLOAD_FIELD_LABELS[key] ?? key,
      value: empty ? 'Vacío' : str,
      isEmpty: empty,
    });
  }
  return rows;
}

export default function AdminRequestsScreen() {
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
      setError(err instanceof Error && err.message === 'NO_SESSION' ? 'No hay sesion admin' : 'No se pudieron cargar las solicitudes');
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
        setError(data.error || 'No se pudo aprobar');
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
        setError(data.error || 'No se pudo rechazar');
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
        <Text style={styles.title}>Solicitudes pendientes</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backText}>Volver al panel admin</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="large" color="#111827" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : requests.length === 0 ? (
          <Text style={styles.muted}>No hay solicitudes pendientes.</Text>
        ) : (
          requests.map((request) => (
            <View key={request.id}>
              <StationRequestCard request={request} showCompany />
              <TouchableOpacity style={styles.detailsButton} onPress={() => setDetailRequest(request)} activeOpacity={0.8}>
                <Text style={styles.detailsButtonText}>Ver detalles</Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.approve} onPress={() => onApprove(request.id)} disabled={submitting}>
                  <Text style={styles.approveText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reject} onPress={() => setRejecting(request)} disabled={submitting}>
                  <Text style={styles.rejectText}>Rechazar</Text>
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
              Solicitud #{detailRequest?.id ?? ''}
            </Text>
            {detailRequest ? (
              <ScrollView style={styles.detailScroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.detailLine}>
                  <Text style={styles.detailKey}>Accion: </Text>
                  {detailRequest.action.toUpperCase()}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailKey}>Fecha: </Text>
                  {new Date(detailRequest.created_at).toLocaleString()}
                </Text>
                {typeof detailRequest.station_id === 'number' ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>Estacion ID: </Text>
                    {String(detailRequest.station_id)}
                  </Text>
                ) : null}
                <Text style={styles.detailSection}>Empresa</Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailKey}>Empresa (ID): </Text>
                  {String(detailRequest.empresa_id)}
                </Text>
                {detailRequest.empresa_nombre ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>Nombre: </Text>
                    {detailRequest.empresa_nombre}
                  </Text>
                ) : null}
                {detailRequest.empresa_email ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>Email: </Text>
                    {detailRequest.empresa_email}
                  </Text>
                ) : null}
                {detailRequest.empresa_username ? (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailKey}>Usuario: </Text>
                    {detailRequest.empresa_username}
                  </Text>
                ) : null}
                <Text style={styles.detailSection}>Datos de la solicitud</Text>
                {formatPayloadRows(detailRequest.payload).map((row) => (
                  <View key={`payload-${row.key}`} style={styles.detailRow}>
                    <Text style={styles.detailFieldLabel}>{row.label}</Text>
                    <Text style={[styles.detailFieldValue, row.isEmpty && styles.detailFieldValueEmpty]}>{row.value}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.detailClose} onPress={() => setDetailRequest(null)}>
              <Text style={styles.detailCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Motivo del rechazo</Text>
            <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Escribe un motivo (opcional)" placeholderTextColor="#9ca3af" multiline />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancel} onPress={() => setRejecting(null)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reject} onPress={onReject} disabled={submitting}>
                <Text style={styles.rejectText}>Enviar rechazo</Text>
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
