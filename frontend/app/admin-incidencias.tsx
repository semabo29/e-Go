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

import {
  type Incidencia,
  listPendingIncidencias,
  listHistoryIncidencias,
  validateIncidencia,
  rejectIncidencia,
  resolveIncidencia,
} from '@/services/incidenciaAdminService';

const TIPUS_LABELS: Record<string, string> = {
  Avariat: 'Averiada',
  Inexistent: 'Inexistente',
  DadesIncorrectes: 'Datos incorrectos',
  Altres: 'Otros',
  Operatiu: 'Operativa',
};

const TIPUS_COLORS: Record<string, string> = {
  Avariat: '#fef3c7',
  Inexistent: '#fee2e2',
  DadesIncorrectes: '#ede9fe',
  Altres: '#f3f4f6',
  Operatiu: '#dcfce7',
};

const TIPUS_TEXT_COLORS: Record<string, string> = {
  Avariat: '#92400e',
  Inexistent: '#b91c1c',
  DadesIncorrectes: '#5b21b6',
  Altres: '#374151',
  Operatiu: '#166534',
};

function statusLabel(inc: Incidencia): string {
  if (inc.rebutjada) return 'Rechazada';
  if (inc.resolta) return 'Resuelta';
  if (inc.validada) return 'Validada';
  return 'Pendiente';
}

function statusColor(inc: Incidencia): string {
  if (inc.rebutjada) return '#ef4444';
  if (inc.resolta) return '#10b981';
  if (inc.validada) return '#3b82f6';
  return '#f59e0b';
}

type IncidenciaCardProps = {
  inc: Incidencia;
  onValidate: () => void;
  onReject: () => void;
  onResolve: () => void;
  onDetails: () => void;
  submitting: boolean;
};

function IncidenciaCard({ inc, onValidate, onReject, onResolve, onDetails, submitting }: IncidenciaCardProps) {
  const canValidate = !inc.validada && !inc.rebutjada;
  const canReject = !inc.validada && !inc.rebutjada && !inc.resolta;
  const canResolve = inc.validada && !inc.resolta && !inc.rebutjada;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: TIPUS_COLORS[inc.tipus] ?? '#f3f4f6' }]}>
          <Text style={[styles.typeBadgeText, { color: TIPUS_TEXT_COLORS[inc.tipus] ?? '#374151' }]}>
            {TIPUS_LABELS[inc.tipus] ?? inc.tipus}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(inc) }]}>
          <Text style={styles.statusBadgeText}>{statusLabel(inc)}</Text>
        </View>
      </View>

      <Text style={styles.stationName}>
        {inc.estacio_nom ?? `Estación #${inc.estacio}`}
        {inc.estacio_municipi ? ` · ${inc.estacio_municipi}` : ''}
      </Text>
      <Text style={styles.meta}>
        {inc.conductor_username} · {new Date(inc.data_inici).toLocaleString()}
      </Text>
      <Text style={styles.comment} numberOfLines={2}>
        {inc.comentari}
      </Text>

      <TouchableOpacity style={styles.detailBtn} onPress={onDetails}>
        <Text style={styles.detailBtnText}>Ver detalles</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        {canValidate && (
          <TouchableOpacity style={styles.btnValidate} onPress={onValidate} disabled={submitting}>
            <Text style={styles.btnValidateText}>Validar</Text>
          </TouchableOpacity>
        )}
        {canReject && (
          <TouchableOpacity style={styles.btnReject} onPress={onReject} disabled={submitting}>
            <Text style={styles.btnRejectText}>Rechazar</Text>
          </TouchableOpacity>
        )}
        {canResolve && (
          <TouchableOpacity style={styles.btnResolve} onPress={onResolve} disabled={submitting}>
            <Text style={styles.btnResolveText}>Marcar resuelta</Text>
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
      setError(err instanceof Error ? err.message : 'Error cargando incidencias');
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
        onReject={() => { setRejectingInc(inc); setRejectMotiu(''); }}
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
      const premiumSuffix = pts?.isPremium ? ' (premium x2)' : '';
      const msg = pts
        ? `Incidencia validada. Se otorgaron ${pts.points} puntos al conductor${premiumSuffix}.`
        : 'Incidencia validada.';
      Alert.alert('Validada', msg);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo validar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectingInc) return;
    setSubmitting(true);
    try {
      await rejectIncidencia(rejectingInc.id, rejectMotiu.trim() || undefined);
      Alert.alert('Rechazada', 'La incidencia ha sido rechazada.');
      setRejectingInc(null);
      setRejectMotiu('');
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo rechazar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(id: number) {
    setSubmitting(true);
    try {
      await resolveIncidencia(id);
      Alert.alert('Resuelta', 'La incidencia ha sido marcada como resuelta.');
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo resolver');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Gestión de incidencias</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backBtnText}>Volver al panel admin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} disabled={loading}>
          <Text style={styles.refreshBtnText}>{loading ? 'Cargando…' : 'Actualizar'}</Text>
        </TouchableOpacity>

        {loading && (
          <ActivityIndicator size="large" color="#111827" style={{ marginTop: 24 }} />
        )}
        {!loading && error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {!loading && !error && (
          <>
            {/* ── Sección pendientes ── */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.sectionTitle}>Pendientes</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{pending.length}</Text>
              </View>
            </View>
            {renderSection(pending, 'No hay incidencias pendientes.')}

            {/* ── Sección validadas ── */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <View style={[styles.sectionDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.sectionTitle}>Validadas</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.sectionBadgeText, { color: '#1d4ed8' }]}>{validated.length}</Text>
              </View>
            </View>
            {renderSection(validated, 'No hay incidencias validadas pendientes de resolver.')}
          </>
        )}
      </View>

      {/* Modal detalles */}
      <Modal visible={!!detailInc} transparent animationType="fade" onRequestClose={() => setDetailInc(null)}>
        <View style={styles.overlay}>
          <View style={styles.detailCard}>
            <Text style={styles.modalTitle}>Incidencia #{detailInc?.id}</Text>
            {detailInc && (
              <ScrollView style={styles.detailScroll}>
                <Row label="Tipo" value={TIPUS_LABELS[detailInc.tipus] ?? detailInc.tipus} />
                <Row label="Estado" value={statusLabel(detailInc)} />
                <Row label="Estación" value={detailInc.estacio_nom ?? `#${detailInc.estacio}`} />
                {detailInc.estacio_municipi ? <Row label="Municipio" value={detailInc.estacio_municipi} /> : null}
                <Row label="Conductor" value={detailInc.conductor_username} />
                <Row label="Email" value={detailInc.conductor_email} />
                <Row label="Fecha reporte" value={new Date(detailInc.data_inici).toLocaleString()} />
                <Row label="Comentario" value={detailInc.comentari} />
                {detailInc.motiu_rebuig ? <Row label="Motivo rechazo" value={detailInc.motiu_rebuig} /> : null}
                {detailInc.data_validacio ? <Row label="Fecha validación" value={new Date(detailInc.data_validacio).toLocaleString()} /> : null}
                {detailInc.data_resolucio ? <Row label="Fecha resolución" value={new Date(detailInc.data_resolucio).toLocaleString()} /> : null}
                {detailInc.data_rebuig ? <Row label="Fecha rechazo" value={new Date(detailInc.data_rebuig).toLocaleString()} /> : null}
                {detailInc.arxiu ? (
                  <View style={styles.imageContainer}>
                    <Text style={styles.rowLabel}>Imagen adjunta</Text>
                    <Image source={{ uri: detailInc.arxiu }} style={styles.image} resizeMode="contain" />
                  </View>
                ) : null}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailInc(null)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal rechazo */}
      <Modal visible={!!rejectingInc} transparent animationType="fade" onRequestClose={() => setRejectingInc(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rechazar incidencia #{rejectingInc?.id}</Text>
            <TextInput
              style={styles.input}
              value={rejectMotiu}
              onChangeText={setRejectMotiu}
              placeholder="Motivo del rechazo (opcional)"
              placeholderTextColor="#9ca3af"
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectingInc(null)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnReject} onPress={handleReject} disabled={submitting}>
                <Text style={styles.btnRejectText}>Rechazar</Text>
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
  btnValidate: { flex: 1, minWidth: 90, paddingVertical: 10, borderRadius: 8, backgroundColor: '#111827', alignItems: 'center' },
  btnValidateText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnReject: { flex: 1, minWidth: 90, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center' },
  btnRejectText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  btnResolve: { flex: 1, minWidth: 90, paddingVertical: 10, borderRadius: 8, backgroundColor: '#dcfce7', alignItems: 'center' },
  btnResolveText: { color: '#166534', fontWeight: '700', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
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
  input: { minHeight: 80, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 12, color: '#111827', textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { color: '#111827', fontWeight: '700' },
});
