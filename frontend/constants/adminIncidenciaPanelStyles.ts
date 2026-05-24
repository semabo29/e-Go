/**
 * Shared list + modal styles for admin incidencia screens (pending + history).
 * Core style objects are defined once; each screen merges extras in a single StyleSheet.create.
 */

import { StyleSheet } from 'react-native';

import type { ScreenTheme } from '@/constants/screenTheme';

export function getAdminIncidenciaCoreStyleObjects(theme: ScreenTheme) {
  return {
    screen: { flex: 1, backgroundColor: theme.panelScreenBg },
    scroll: { flexGrow: 1, alignItems: 'center' as const, padding: 16, paddingVertical: 32 },
    container: { width: '100%' as const, maxWidth: 640 },
    title: { fontSize: 22, fontWeight: '700' as const, color: theme.title, textAlign: 'center' as const, marginBottom: 8 },
    backBtn: { alignSelf: 'center' as const, marginBottom: 6 },
    backBtnText: { color: theme.mutedText, fontWeight: '600' as const },
    errorText: { color: theme.error, textAlign: 'center' as const, marginTop: 16 },
    muted: { color: theme.mutedText, textAlign: 'center' as const, marginVertical: 12 },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme.isDark ? 0.2 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: { flexDirection: 'row' as const, gap: 8, marginBottom: 8, flexWrap: 'wrap' as const },
    typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    typeBadgeText: { fontSize: 12, fontWeight: '700' as const },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusBadgeText: { fontSize: 12, fontWeight: '700' as const, color: theme.textOnAccent },
    stationName: { fontSize: 15, fontWeight: '600' as const, color: theme.title, marginBottom: 2 },
    meta: { fontSize: 12, color: theme.mutedText, marginBottom: 6 },
    comment: { fontSize: 13, color: theme.body, marginBottom: 10 },
    detailBtn: {
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center' as const,
      marginBottom: 8,
    },
    detailBtnText: { color: theme.title, fontWeight: '600' as const, fontSize: 13 },
    actions: { flexDirection: 'row' as const, gap: 8, flexWrap: 'wrap' as const },
    btnValidate: {
      flex: 1,
      minWidth: 90,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.primaryBtnBg,
      alignItems: 'center' as const,
    },
    btnValidateText: { color: theme.primaryBtnText, fontWeight: '700' as const, fontSize: 13 },
    btnReject: {
      flex: 1,
      minWidth: 90,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.dangerBtnBg,
      alignItems: 'center' as const,
    },
    btnRejectText: { color: theme.dangerBtnText, fontWeight: '700' as const, fontSize: 13 },
    btnResolve: {
      flex: 1,
      minWidth: 90,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.isDark ? '#14532d' : '#dcfce7',
      alignItems: 'center' as const,
    },
    btnResolveText: { color: theme.sem.mapOk, fontWeight: '700' as const, fontSize: 13 },
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 20,
    },
    detailCard: {
      width: '100%' as const,
      maxWidth: 440,
      maxHeight: '88%' as const,
      backgroundColor: theme.modalSurface,
      borderRadius: 16,
      padding: 20,
    },
    detailScroll: { maxHeight: 420, marginBottom: 12 },
    detailRow: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    detailLabel: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: theme.mutedText,
      textTransform: 'uppercase' as const,
      marginBottom: 2,
    },
    detailValue: { fontSize: 14, color: theme.title },
    modalCard: {
      width: '100%' as const,
      maxWidth: 400,
      backgroundColor: theme.modalSurface,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' as const, color: theme.title, marginBottom: 12 },
    modalInput: {
      minHeight: 80,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
      color: theme.inputText,
      backgroundColor: theme.inputBg,
      textAlignVertical: 'top' as const,
    },
    modalActions: { flexDirection: 'row' as const, gap: 10 },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.secondaryBtnBg,
      alignItems: 'center' as const,
    },
    modalCancelBtnText: { color: theme.secondaryBtnText, fontWeight: '700' as const },
    modalCloseBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.primaryBtnBg,
      alignItems: 'center' as const,
    },
    modalCloseBtnText: { color: theme.primaryBtnText, fontWeight: '700' as const },
  };
}

/** One StyleSheet per screen — core objects defined once, merged at create time. */
export function createAdminIncidenciaScreenStyles<T extends object>(theme: ScreenTheme, extra: T) {
  return StyleSheet.create({
    ...getAdminIncidenciaCoreStyleObjects(theme),
    ...extra,
  }) as any;
}
