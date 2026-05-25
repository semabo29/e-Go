import { useEffect, useMemo, useState } from 'react';
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
import { createAdminIncidenciaScreenStyles } from '@/constants/adminIncidenciaPanelStyles';
import type { ScreenTheme } from '@/constants/screenTheme';
import { useScreenTheme } from '@/hooks/use-screen-theme';

type AdminIncStyles = ReturnType<typeof createAdminIncidenciasStyles>;

type IncidenciaCardProps = {
  inc: Incidencia;
  onValidate: () => void;
  onReject: () => void;
  onResolve: () => void;
  onDetails: () => void;
  submitting: boolean;
  styles: AdminIncStyles;
};

function IncidenciaCard({ inc, onValidate, onReject, onResolve, onDetails, submitting, styles }: IncidenciaCardProps) {
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

type RowProps = { label: string; value: string; styles: AdminIncStyles };

function Row({ label, value, styles }: RowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function AdminIncidenciasScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useScreenTheme();
  const styles = useMemo(() => createAdminIncidenciasStyles(theme), [theme.isDark, theme.sem]);
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
        styles={styles}
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

        {loading && <ActivityIndicator size="large" color={theme.primaryBtnBg} style={{ marginTop: 24 }} />}
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
                <Row styles={styles} label={t('adminIncidents.fields.type')} value={incidentTypeLabel(detailInc.tipus, t)} />
                <Row styles={styles} label={t('adminIncidents.fields.status')} value={incidentStatusLabel(detailInc, t)} />
                <Row
                  styles={styles}
                  label={t('adminIncidents.fields.station')}
                  value={detailInc.estacio_nom ?? `#${detailInc.estacio}`}
                />
                {detailInc.estacio_municipi ? (
                  <Row styles={styles} label={t('adminIncidents.fields.municipality')} value={detailInc.estacio_municipi} />
                ) : null}
                <Row styles={styles} label={t('adminIncidents.fields.driver')} value={detailInc.conductor_username} />
                <Row styles={styles} label={t('adminIncidents.fields.email')} value={detailInc.conductor_email} />
                <Row
                  styles={styles}
                  label={t('adminIncidents.fields.reportDate')}
                  value={new Date(detailInc.data_inici).toLocaleString()}
                />
                <Row styles={styles} label={t('adminIncidents.fields.comment')} value={detailInc.comentari} />
                {detailInc.motiu_rebuig ? (
                  <Row styles={styles} label={t('adminIncidents.fields.rejectReason')} value={detailInc.motiu_rebuig} />
                ) : null}
                {detailInc.data_validacio ? (
                  <Row
                    styles={styles}
                    label={t('adminIncidents.fields.validationDate')}
                    value={new Date(detailInc.data_validacio).toLocaleString()}
                  />
                ) : null}
                {detailInc.data_resolucio ? (
                  <Row
                    styles={styles}
                    label={t('adminIncidents.fields.resolutionDate')}
                    value={new Date(detailInc.data_resolucio).toLocaleString()}
                  />
                ) : null}
                {detailInc.data_rebuig ? (
                  <Row
                    styles={styles}
                    label={t('adminIncidents.fields.rejectionDate')}
                    value={new Date(detailInc.data_rebuig).toLocaleString()}
                  />
                ) : null}
                {detailInc.arxiu ? (
                  <View style={styles.imageContainer}>
                    <Text style={styles.detailLabel}>{t('adminIncidents.fields.attachedImage')}</Text>
                    <Image source={{ uri: detailInc.arxiu }} style={styles.image} resizeMode="contain" />
                  </View>
                ) : null}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailInc(null)}>
              <Text style={styles.modalCloseBtnText}>{t('adminIncidents.close')}</Text>
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

function createAdminIncidenciasStyles(theme: ScreenTheme) {
  return createAdminIncidenciaScreenStyles(theme, {
    refreshBtn: { alignSelf: 'center', marginBottom: 16 },
    refreshBtnText: { color: theme.title, fontWeight: '600', fontSize: 14 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
    },
    sectionDot: { width: 10, height: 10, borderRadius: 5 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.title, flex: 1 },
    sectionBadge: {
      backgroundColor: theme.isDark ? '#422006' : '#fef3c7',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    sectionBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.isDark ? '#fcd34d' : '#92400e',
    },
    imageContainer: { marginBottom: 10 },
    image: { width: '100%', height: 180, borderRadius: 8, marginTop: 6 },
  });
}
