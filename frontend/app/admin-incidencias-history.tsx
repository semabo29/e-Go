import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
  type IncidenciaTipus,
  type IncidenciaEstado,
  listHistoryIncidencias,
  validateIncidencia,
  rejectIncidencia,
  resolveIncidencia,
} from '@/services/incidenciaAdminService';
import {
  ADMIN_INCIDENT_TIPUS,
  incidentStatusColor,
  incidentStatusLabel,
  incidentTypeLabel,
  TIPUS_COLORS,
  TIPUS_TEXT_COLORS,
} from '@/utils/adminIncidentUi';
import { createAdminIncidenciaScreenStyles } from '@/constants/adminIncidenciaPanelStyles';
import type { ScreenTheme } from '@/constants/screenTheme';
import { useScreenTheme } from '@/hooks/use-screen-theme';

const ALL_ESTADO_KEYS: IncidenciaEstado[] = ['pending', 'validated', 'resolved', 'rejected'];

type AdminIncHistoryStyles = ReturnType<typeof createAdminIncidenciasHistoryStyles>;

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const PAGE_SIZE = 20;

export default function AdminIncidenciasHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useScreenTheme();
  const styles = useMemo(() => createAdminIncidenciasHistoryStyles(theme), [theme.isDark, theme.sem]);
  const estadoFilters = useMemo(
    () =>
      ALL_ESTADO_KEYS.map((key) => ({
        key,
        label: t(`adminIncidents.status.${key}`),
      })),
    [t]
  );
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
      setError(err instanceof Error ? err.message : t('adminIncidents.loadHistoryError'));
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

  async function handleValidate(id: number) {
    setSubmitting(true);
    try {
      const result = await validateIncidencia(id);
      const pts = result.pointsAwarded;
      const premiumSuffix = pts?.isPremium ? t('adminIncidents.alerts.premiumSuffix') : '';
      const msg = pts
        ? t('adminIncidents.alerts.validatedShort', { points: pts.points, premium: premiumSuffix })
        : t('adminIncidents.alerts.validatedSimple');
      setIncidencias((prev) => prev.map((i) => (i.id === id ? result.incidencia : i)));
      setDetailInc(null);
      alert(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminIncidents.alerts.validateError'));
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
      setError(err instanceof Error ? err.message : t('adminIncidents.alerts.rejectError'));
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
      setError(err instanceof Error ? err.message : t('adminIncidents.alerts.resolveError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('adminIncidents.historyTitle')}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/admin-home')}>
          <Text style={styles.backBtnText}>{t('adminIncidents.backToPanel')}</Text>
        </TouchableOpacity>

        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>{t('adminIncidents.filter.title')}</Text>

          <View style={styles.chipRow}>
            <TouchableOpacity style={styles.shortcutChip} onPress={setLastWeek}>
              <Text style={styles.shortcutChipText}>{t('adminIncidents.filter.lastWeek')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shortcutChip} onPress={setLastMonth}>
              <Text style={styles.shortcutChipText}>{t('adminIncidents.filter.lastMonth')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shortcutChipClear} onPress={clearFilters}>
              <Text style={styles.shortcutChipClearText}>{t('adminIncidents.filter.clear')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{t('adminIncidents.filter.fromDate')}</Text>
              <TextInput
                style={styles.dateInput}
                value={from}
                onChangeText={setFrom}
                placeholder="2026-01-01"
                placeholderTextColor={theme.placeholder}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{t('adminIncidents.filter.toDate')}</Text>
              <TextInput
                style={styles.dateInput}
                value={to}
                onChangeText={setTo}
                placeholder="2026-12-31"
                placeholderTextColor={theme.placeholder}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Filtro por tipo */}
          <Text style={styles.filterSectionLabel}>{t('adminIncidents.filter.type')}</Text>
          <View style={styles.chipRow}>
            {ADMIN_INCIDENT_TIPUS.map((tipus) => (
              <TouchableOpacity
                key={tipus}
                style={[styles.filterChip, selectedTipus === tipus && styles.filterChipActive]}
                onPress={() => setSelectedTipus(selectedTipus === tipus ? '' : tipus)}
              >
                <Text style={[styles.filterChipText, selectedTipus === tipus && styles.filterChipTextActive]}>
                  {incidentTypeLabel(tipus, t)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterSectionLabel}>{t('adminIncidents.filter.status')}</Text>
          <View style={styles.chipRow}>
            {estadoFilters.map((e) => (
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
            <Text style={styles.applyBtnText}>
              {loading ? t('adminIncidents.filter.searching') : t('adminIncidents.filter.apply')}
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && incidencias.length === 0 && (
          <ActivityIndicator size="large" color={theme.primaryBtnBg} style={{ marginTop: 24 }} />
        )}
        {!loading && incidencias.length === 0 && (
          <Text style={styles.muted}>{t('adminIncidents.emptyFiltered')}</Text>
        )}
        {incidencias.length > 0 && (
          <>
            {incidencias.map((inc) => {
              const canValidate = !inc.validada && !inc.rebutjada;
              const canReject = !inc.validada && !inc.rebutjada && !inc.resolta;
              const canResolve = inc.validada && !inc.resolta && !inc.rebutjada;
              return (
                <View key={inc.id} style={styles.card}>
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
                  <Text style={styles.comment} numberOfLines={2}>{inc.comentari}</Text>
                  <TouchableOpacity style={styles.detailBtn} onPress={() => setDetailInc(inc)}>
                    <Text style={styles.detailBtnText}>{t('adminIncidents.viewDetails')}</Text>
                  </TouchableOpacity>
                  <View style={styles.actions}>
                    {canValidate && (
                      <TouchableOpacity style={styles.btnValidate} onPress={() => handleValidate(inc.id)} disabled={submitting}>
                        <Text style={styles.btnValidateText}>{t('adminIncidents.validate')}</Text>
                      </TouchableOpacity>
                    )}
                    {canReject && (
                      <TouchableOpacity style={styles.btnReject} onPress={() => { setRejectingInc(inc); setRejectMotiu(''); }} disabled={submitting}>
                        <Text style={styles.btnRejectText}>{t('adminIncidents.reject')}</Text>
                      </TouchableOpacity>
                    )}
                    {canResolve && (
                      <TouchableOpacity style={styles.btnResolve} onPress={() => handleResolve(inc.id)} disabled={submitting}>
                        <Text style={styles.btnResolveText}>{t('adminIncidents.markResolved')}</Text>
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
                <Text style={styles.loadMoreBtnText}>
                  {loading ? t('adminIncidents.loading') : t('adminIncidents.loadMore')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Modal detalles */}
      <Modal visible={!!detailInc} transparent animationType="fade" onRequestClose={() => setDetailInc(null)}>
        <View style={styles.overlay}>
          <View style={styles.detailCard}>
            <Text style={styles.modalTitle}>{t('adminIncidents.modalTitle', { id: detailInc?.id })}</Text>
            {detailInc && (
              <ScrollView style={styles.detailScroll}>
                <DetailRow styles={styles} label={t('adminIncidents.fields.type')} value={incidentTypeLabel(detailInc.tipus, t)} />
                <DetailRow styles={styles} label={t('adminIncidents.fields.status')} value={incidentStatusLabel(detailInc, t)} />
                <DetailRow styles={styles} label={t('adminIncidents.fields.station')} value={detailInc.estacio_nom ?? `#${detailInc.estacio}`} />
                {detailInc.estacio_municipi ? (
                  <DetailRow styles={styles} label={t('adminIncidents.fields.municipality')} value={detailInc.estacio_municipi} />
                ) : null}
                <DetailRow styles={styles} label={t('adminIncidents.fields.driver')} value={detailInc.conductor_username} />
                <DetailRow styles={styles} label={t('adminIncidents.fields.email')} value={detailInc.conductor_email} />
                <DetailRow
                  styles={styles}
                  label={t('adminIncidents.fields.reportDate')}
                  value={new Date(detailInc.data_inici).toLocaleString()}
                />
                <DetailRow styles={styles} label={t('adminIncidents.fields.comment')} value={detailInc.comentari} />
                {detailInc.motiu_rebuig ? (
                  <DetailRow styles={styles} label={t('adminIncidents.fields.rejectReason')} value={detailInc.motiu_rebuig} />
                ) : null}
                {detailInc.data_validacio ? (
                  <DetailRow
                    styles={styles}
                    label={t('adminIncidents.fields.validationDate')}
                    value={new Date(detailInc.data_validacio).toLocaleString()}
                  />
                ) : null}
                {detailInc.data_resolucio ? (
                  <DetailRow
                    styles={styles}
                    label={t('adminIncidents.fields.resolutionDate')}
                    value={new Date(detailInc.data_resolucio).toLocaleString()}
                  />
                ) : null}
                {detailInc.data_rebuig ? (
                  <DetailRow
                    styles={styles}
                    label={t('adminIncidents.fields.rejectionDate')}
                    value={new Date(detailInc.data_rebuig).toLocaleString()}
                  />
                ) : null}
                <DetailRow
                  styles={styles}
                  label={t('adminIncidents.fields.pointsAwarded')}
                  value={detailInc.punts_atorgats ? t('adminIncidents.pointsYes') : t('adminIncidents.pointsNo')}
                />
              </ScrollView>
            )}
            {detailInc && !detailInc.validada && !detailInc.rebutjada && (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnValidate} onPress={() => handleValidate(detailInc.id)} disabled={submitting}>
                  <Text style={styles.btnValidateText}>{t('adminIncidents.validate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnReject} onPress={() => { setRejectingInc(detailInc); setRejectMotiu(''); }} disabled={submitting}>
                  <Text style={styles.btnRejectText}>{t('adminIncidents.reject')}</Text>
                </TouchableOpacity>
              </View>
            )}
            {detailInc?.validada && !detailInc.resolta && !detailInc.rebutjada && (
              <TouchableOpacity style={[styles.btnResolve, { marginBottom: 8 }]} onPress={() => handleResolve(detailInc.id)} disabled={submitting}>
                <Text style={styles.btnResolveText}>{t('adminIncidents.markResolved')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailInc(null)}>
              <Text style={styles.modalCloseBtnText}>{t('adminIncidents.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal rechazo */}
      <Modal visible={!!rejectingInc} transparent animationType="fade" onRequestClose={() => setRejectingInc(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('adminIncidents.rejectModalShort', { id: rejectingInc?.id })}</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectMotiu}
              onChangeText={setRejectMotiu}
              placeholder={t('adminIncidents.rejectPlaceholder')}
              placeholderTextColor={theme.placeholder}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectingInc(null)}>
                <Text style={styles.modalCancelBtnText}>{t('common.cancel')}</Text>
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

type DetailRowProps = { label: string; value: string; styles: AdminIncHistoryStyles };
function DetailRow({ label, value, styles }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function createAdminIncidenciasHistoryStyles(theme: ScreenTheme) {
  return createAdminIncidenciaScreenStyles(theme, {
    title: { marginBottom: 6 },
    backBtn: { marginBottom: 14 },
    errorText: { marginVertical: 8, marginTop: 0 },
    muted: { marginTop: 24, marginVertical: 0 },
    filterBox: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    filterTitle: { fontSize: 15, fontWeight: '700', color: theme.title, marginBottom: 10 },
    filterSectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.mutedText,
      textTransform: 'uppercase',
      marginTop: 10,
      marginBottom: 6,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    shortcutChip: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.secondaryBtnBg,
    },
    shortcutChipText: { fontSize: 13, color: theme.secondaryBtnText, fontWeight: '600' },
    shortcutChipClear: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.dangerBtnBg,
    },
    shortcutChipClearText: { fontSize: 13, color: theme.dangerBtnText, fontWeight: '600' },
    filterChip: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.chipBg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipActive: { backgroundColor: theme.primaryBtnBg, borderColor: theme.primaryBtnBg },
    filterChipText: { fontSize: 13, color: theme.secondaryText, fontWeight: '600' },
    filterChipTextActive: { color: theme.primaryBtnText },
    dateRow: { flexDirection: 'row', gap: 10, marginBottom: 4, marginTop: 8 },
    dateField: { flex: 1 },
    dateLabel: { fontSize: 11, fontWeight: '600', color: theme.mutedText, marginBottom: 4 },
    dateInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 8,
      justifyContent: 'center',
      minHeight: 40,
      color: theme.inputText,
      fontSize: 13,
      backgroundColor: theme.inputBg,
    },
    applyBtn: {
      marginTop: 12,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: theme.primaryBtnBg,
      alignItems: 'center',
    },
    applyBtnText: { color: theme.primaryBtnText, fontWeight: '700', fontSize: 14 },
    card: { marginBottom: 12 },
    stationName: { fontSize: 14 },
    comment: { color: theme.secondaryText, marginBottom: 8 },
    detailBtn: { borderColor: theme.border, paddingVertical: 7 },
    btnValidate: { minWidth: 80, paddingVertical: 9 },
    btnReject: { minWidth: 80, paddingVertical: 9 },
    btnResolve: {
      minWidth: 80,
      paddingVertical: 9,
      backgroundColor: theme.sem.chipActiveBg,
    },
    btnResolveText: { color: theme.sem.chipActiveText },
    loadMoreBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.secondaryBtnBg,
      alignItems: 'center',
      marginTop: 4,
    },
    loadMoreBtnText: { color: theme.secondaryBtnText, fontWeight: '700' },
    detailScroll: { maxHeight: 380 },
    modalActions: { marginBottom: 8 },
  });
}
