import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  type Incidencia,
  type IncidenciaTipus,
  type IncidenciaEstado,
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

const ALL_TIPUS: IncidenciaTipus[] = ['Avariat', 'Inexistent', 'DadesIncorrectes', 'Altres', 'Operatiu'];
const ALL_ESTADOS: { key: IncidenciaEstado; label: string }[] = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'validated', label: 'Validada' },
  { key: 'resolved', label: 'Resuelta' },
  { key: 'rejected', label: 'Rechazada' },
];

const STATUS_COLORS: Record<string, string> = {
  Pendiente: '#f59e0b',
  Validada: '#3b82f6',
  Resuelta: '#10b981',
  Rechazada: '#ef4444',
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

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Interpreta YYYY-MM-DD en calendario local (medianoche). */
function parseYmd(s: string): Date | null {
  const m = YMD_RE.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(y, mo - 1, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d;
}

const PAGE_SIZE = 20;

export default function AdminIncidenciasHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedTipus, setSelectedTipus] = useState<IncidenciaTipus | ''>('');
  const [selectedEstado, setSelectedEstado] = useState<IncidenciaEstado | ''>('');

  const androidPickerFieldRef = useRef<'from' | 'to'>('from');
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [androidPickerDate, setAndroidPickerDate] = useState(() => new Date());

  const [iosPicker, setIosPicker] = useState<null | { field: 'from' | 'to'; date: Date }>(null);

  const [detailInc, setDetailInc] = useState<Incidencia | null>(null);
  const [rejectingInc, setRejectingInc] = useState<Incidencia | null>(null);
  const [rejectMotiu, setRejectMotiu] = useState('');

  async function load(newOffset = 0, replace = true) {
    setLoading(true);
    setError('');
    try {
      const results = await listHistoryIncidencias({
        from: from || undefined,
        to: to || undefined,
        tipus: selectedTipus || undefined,
        estado: selectedEstado || undefined,
        limit: PAGE_SIZE + 1,
        offset: newOffset,
      });
      const page = results.slice(0, PAGE_SIZE);
      setHasMore(results.length > PAGE_SIZE);
      setOffset(newOffset);
      setIncidencias(replace ? page : (prev) => [...prev, ...page]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando histórico');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0, true);
  }, []);

  function applyFilters() {
    load(0, true);
  }

  function setLastWeek() {
    const now = new Date();
    const week = new Date();
    week.setDate(week.getDate() - 7);
    setFrom(toLocalDateString(week));
    setTo(toLocalDateString(now));
  }

  function setLastMonth() {
    const now = new Date();
    const month = new Date();
    month.setMonth(month.getMonth() - 1);
    setFrom(toLocalDateString(month));
    setTo(toLocalDateString(now));
  }

  function clearFilters() {
    setFrom('');
    setTo('');
    setSelectedTipus('');
    setSelectedEstado('');
  }

  function openDatePicker(field: 'from' | 'to') {
    const str = field === 'from' ? from : to;
    const initial = parseYmd(str) ?? new Date();
    if (Platform.OS === 'web') return;
    if (Platform.OS === 'android') {
      androidPickerFieldRef.current = field;
      setAndroidPickerDate(initial);
      setAndroidPickerVisible(true);
      return;
    }
    setIosPicker({ field, date: initial });
  }

  function onAndroidDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setAndroidPickerVisible(false);
    const field = androidPickerFieldRef.current;
    if (event.type !== 'set' || selectedDate == null) return;
    const ymd = toLocalDateString(selectedDate);
    if (field === 'from') setFrom(ymd);
    else setTo(ymd);
  }

  function confirmIosPicker() {
    if (!iosPicker) return;
    const ymd = toLocalDateString(iosPicker.date);
    if (iosPicker.field === 'from') setFrom(ymd);
    else setTo(ymd);
    setIosPicker(null);
  }

  async function handleValidate(id: number) {
    setSubmitting(true);
    try {
      const result = await validateIncidencia(id);
      const pts = result.pointsAwarded;
      const premiumSuffix = pts?.isPremium ? ' (premium x2)' : '';
      const msg = pts
        ? `Validada. Se otorgaron ${pts.points} puntos${premiumSuffix}.`
        : 'Incidencia validada.';
      setIncidencias((prev) => prev.map((i) => (i.id === id ? result.incidencia : i)));
      setDetailInc(null);
      alert(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectingInc) return;
    setSubmitting(true);
    try {
      const updated = await rejectIncidencia(rejectingInc.id, rejectMotiu.trim() || undefined);
      setIncidencias((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setRejectingInc(null);
      setRejectMotiu('');
      setDetailInc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo rechazar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(id: number) {
    setSubmitting(true);
    try {
      const updated = await resolveIncidencia(id);
      setIncidencias((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setDetailInc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resolver');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Histórico de incidencias</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backBtnText}>Volver al panel admin</Text>
        </TouchableOpacity>

        {/* Filtros */}
        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>Filtros</Text>

          {/* Atajos de rango */}
          <View style={styles.chipRow}>
            <TouchableOpacity style={styles.shortcutChip} onPress={setLastWeek}>
              <Text style={styles.shortcutChipText}>Última semana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shortcutChip} onPress={setLastMonth}>
              <Text style={styles.shortcutChipText}>Último mes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shortcutChipClear} onPress={clearFilters}>
              <Text style={styles.shortcutChipClearText}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          {/* Rango de fechas (calendario nativo en iOS/Android; texto en web) */}
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Desde</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.dateInput}
                  value={from}
                  onChangeText={setFrom}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              ) : (
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => openDatePicker('from')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateInputText, !from && styles.dateInputPlaceholder]}>
                    {from || 'Toca para elegir'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Hasta</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.dateInput}
                  value={to}
                  onChangeText={setTo}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              ) : (
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => openDatePicker('to')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateInputText, !to && styles.dateInputPlaceholder]}>
                    {to || 'Toca para elegir'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtro por tipo */}
          <Text style={styles.filterSectionLabel}>Tipo</Text>
          <View style={styles.chipRow}>
            {ALL_TIPUS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.filterChip, selectedTipus === t && styles.filterChipActive]}
                onPress={() => setSelectedTipus(selectedTipus === t ? '' : t)}
              >
                <Text style={[styles.filterChipText, selectedTipus === t && styles.filterChipTextActive]}>
                  {TIPUS_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filtro por estado */}
          <Text style={styles.filterSectionLabel}>Estado</Text>
          <View style={styles.chipRow}>
            {ALL_ESTADOS.map((e) => (
              <TouchableOpacity
                key={e.key}
                style={[styles.filterChip, selectedEstado === e.key && styles.filterChipActive]}
                onPress={() => setSelectedEstado(selectedEstado === e.key ? '' : e.key)}
              >
                <Text style={[styles.filterChipText, selectedEstado === e.key && styles.filterChipTextActive]}>
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} disabled={loading}>
            <Text style={styles.applyBtnText}>{loading ? 'Buscando…' : 'Aplicar filtros'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && incidencias.length === 0 && (
          <ActivityIndicator size="large" color="#111827" style={{ marginTop: 24 }} />
        )}
        {!loading && incidencias.length === 0 && (
          <Text style={styles.muted}>No se encontraron incidencias con los filtros aplicados.</Text>
        )}
        {incidencias.length > 0 && (
          <>
            {incidencias.map((inc) => {
              const st = statusLabel(inc);
              const canValidate = !inc.validada && !inc.rebutjada;
              const canReject = !inc.validada && !inc.rebutjada && !inc.resolta;
              const canResolve = inc.validada && !inc.resolta && !inc.rebutjada;
              return (
                <View key={inc.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: TIPUS_COLORS[inc.tipus] ?? '#f3f4f6' }]}>
                      <Text style={[styles.typeBadgeText, { color: TIPUS_TEXT_COLORS[inc.tipus] ?? '#374151' }]}>
                        {TIPUS_LABELS[inc.tipus] ?? inc.tipus}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[st] ?? '#9ca3af' }]}>
                      <Text style={styles.statusBadgeText}>{st}</Text>
                    </View>
                  </View>
                  <Text style={styles.stationName}>
                    {inc.estacio_nom ?? `Estación #${inc.estacio}`}
                    {inc.estacio_municipi ? ` · ${inc.estacio_municipi}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {inc.conductor_username} · {new Date(inc.data_inici).toLocaleString()}
                  </Text>
                  <Text style={styles.comment} numberOfLines={2}>{inc.comentari}</Text>
                  <TouchableOpacity style={styles.detailBtn} onPress={() => setDetailInc(inc)}>
                    <Text style={styles.detailBtnText}>Ver detalles</Text>
                  </TouchableOpacity>
                  <View style={styles.actions}>
                    {canValidate && (
                      <TouchableOpacity style={styles.btnValidate} onPress={() => handleValidate(inc.id)} disabled={submitting}>
                        <Text style={styles.btnValidateText}>Validar</Text>
                      </TouchableOpacity>
                    )}
                    {canReject && (
                      <TouchableOpacity style={styles.btnReject} onPress={() => { setRejectingInc(inc); setRejectMotiu(''); }} disabled={submitting}>
                        <Text style={styles.btnRejectText}>Rechazar</Text>
                      </TouchableOpacity>
                    )}
                    {canResolve && (
                      <TouchableOpacity style={styles.btnResolve} onPress={() => handleResolve(inc.id)} disabled={submitting}>
                        <Text style={styles.btnResolveText}>Marcar resuelta</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => load(offset + PAGE_SIZE, false)}
                disabled={loading}
              >
                <Text style={styles.loadMoreBtnText}>{loading ? 'Cargando…' : 'Cargar más'}</Text>
              </TouchableOpacity>
            )}
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
                <DetailRow label="Tipo" value={TIPUS_LABELS[detailInc.tipus] ?? detailInc.tipus} />
                <DetailRow label="Estado" value={statusLabel(detailInc)} />
                <DetailRow label="Estación" value={detailInc.estacio_nom ?? `#${detailInc.estacio}`} />
                {detailInc.estacio_municipi ? <DetailRow label="Municipio" value={detailInc.estacio_municipi} /> : null}
                <DetailRow label="Conductor" value={detailInc.conductor_username} />
                <DetailRow label="Email" value={detailInc.conductor_email} />
                <DetailRow label="Fecha reporte" value={new Date(detailInc.data_inici).toLocaleString()} />
                <DetailRow label="Comentario" value={detailInc.comentari} />
                {detailInc.motiu_rebuig ? <DetailRow label="Motivo rechazo" value={detailInc.motiu_rebuig} /> : null}
                {detailInc.data_validacio ? <DetailRow label="Fecha validación" value={new Date(detailInc.data_validacio).toLocaleString()} /> : null}
                {detailInc.data_resolucio ? <DetailRow label="Fecha resolución" value={new Date(detailInc.data_resolucio).toLocaleString()} /> : null}
                {detailInc.data_rebuig ? <DetailRow label="Fecha rechazo" value={new Date(detailInc.data_rebuig).toLocaleString()} /> : null}
                <DetailRow label="Puntos otorgados" value={detailInc.punts_atorgats ? 'Sí' : 'No'} />
              </ScrollView>
            )}
            {detailInc && !detailInc.validada && !detailInc.rebutjada && (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnValidate} onPress={() => handleValidate(detailInc.id)} disabled={submitting}>
                  <Text style={styles.btnValidateText}>Validar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnReject} onPress={() => { setRejectingInc(detailInc); setRejectMotiu(''); }} disabled={submitting}>
                  <Text style={styles.btnRejectText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            )}
            {detailInc?.validada && !detailInc.resolta && !detailInc.rebutjada && (
              <TouchableOpacity style={[styles.btnResolve, { marginBottom: 8 }]} onPress={() => handleResolve(detailInc.id)} disabled={submitting}>
                <Text style={styles.btnResolveText}>Marcar resuelta</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailInc(null)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Selector de fecha (iOS: calendario en modal) */}
      <Modal
        visible={!!iosPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setIosPicker(null)}
      >
        <View style={styles.datePickerOverlay}>
          <TouchableOpacity style={styles.datePickerBackdrop} activeOpacity={1} onPress={() => setIosPicker(null)} />
          <View style={styles.datePickerSheet}>
            <View style={styles.datePickerToolbar}>
              <TouchableOpacity onPress={() => setIosPicker(null)} hitSlop={12}>
                <Text style={styles.datePickerToolbarBtn}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerToolbarTitle}>
                {iosPicker?.field === 'from' ? 'Fecha desde' : 'Fecha hasta'}
              </Text>
              <TouchableOpacity onPress={confirmIosPicker} hitSlop={12}>
                <Text style={[styles.datePickerToolbarBtn, styles.datePickerToolbarBtnPrimary]}>Listo</Text>
              </TouchableOpacity>
            </View>
            {iosPicker ? (
              <DateTimePicker
                value={iosPicker.date}
                mode="date"
                display="inline"
                onChange={(_, date) => {
                  if (date) setIosPicker((prev) => (prev ? { ...prev, date } : prev));
                }}
                locale="es_ES"
                themeVariant="light"
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {androidPickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker
          value={androidPickerDate}
          mode="date"
          display="default"
          onChange={onAndroidDateChange}
        />
      ) : null}

      {/* Modal rechazo */}
      <Modal visible={!!rejectingInc} transparent animationType="fade" onRequestClose={() => setRejectingInc(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rechazar #{rejectingInc?.id}</Text>
            <TextInput
              style={styles.textArea}
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

type DetailRowProps = { label: string; value: string };
function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, alignItems: 'center', padding: 16, paddingVertical: 32 },
  container: { width: '100%', maxWidth: 640 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 },
  backBtn: { alignSelf: 'center', marginBottom: 14 },
  backBtnText: { color: '#6b7280', fontWeight: '600' },
  errorText: { color: '#dc2626', textAlign: 'center', marginVertical: 8 },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  filterBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  filterSectionLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  shortcutChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e5e7eb' },
  shortcutChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  shortcutChipClear: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fee2e2' },
  shortcutChipClearText: { fontSize: 13, color: '#b91c1c', fontWeight: '600' },
  filterChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 4, marginTop: 8 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    minHeight: 40,
    color: '#111827',
    fontSize: 13,
  },
  dateInputText: { color: '#111827', fontSize: 13 },
  dateInputPlaceholder: { color: '#9ca3af' },
  datePickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  datePickerBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  datePickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  datePickerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  datePickerToolbarTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  datePickerToolbarBtn: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  datePickerToolbarBtnPrimary: { color: '#2563eb' },
  applyBtn: { marginTop: 12, paddingVertical: 11, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
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
  stationName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  comment: { fontSize: 13, color: '#374151', marginBottom: 8 },
  detailBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 7, alignItems: 'center', marginBottom: 8 },
  detailBtnText: { color: '#111827', fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnValidate: { flex: 1, minWidth: 80, paddingVertical: 9, borderRadius: 8, backgroundColor: '#111827', alignItems: 'center' },
  btnValidateText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnReject: { flex: 1, minWidth: 80, paddingVertical: 9, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center' },
  btnRejectText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  btnResolve: { flex: 1, minWidth: 80, paddingVertical: 9, borderRadius: 8, backgroundColor: '#dcfce7', alignItems: 'center' },
  btnResolveText: { color: '#166534', fontWeight: '700', fontSize: 13 },
  loadMoreBtn: { paddingVertical: 12, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center', marginTop: 4 },
  loadMoreBtnText: { color: '#374151', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  detailCard: { width: '100%', maxWidth: 440, maxHeight: '88%', backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  detailScroll: { maxHeight: 380, marginBottom: 12 },
  detailRow: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#111827' },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  textArea: { minHeight: 80, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 12, color: '#111827', textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { color: '#111827', fontWeight: '700' },
  closeBtn: { paddingVertical: 12, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '700' },
});
