/**
 * Shared layout + modal chrome for admin panel screens (card on grey background,
 * primary CTA, confirmation dialog). Keeps StyleSheet keys aligned across screens.
 */

import { StyleSheet } from 'react-native';

import type { ScreenTheme } from '@/constants/screenTheme';

export const adminPanelScrollBase = {
  flexGrow: 1,
  alignItems: 'center' as const,
  padding: 24,
  paddingVertical: 40,
};

export const adminPanelSectionHeaderBase = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  marginBottom: 12,
};

export function createAdminPanelChromeStyleObjects(theme: ScreenTheme) {
  return {
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: theme.title,
      textAlign: 'center' as const,
      marginBottom: 10,
    },
    backButton: { marginBottom: 20, paddingVertical: 10, alignItems: 'center' as const },
    backText: { fontSize: 14, fontWeight: '600' as const, color: theme.link },
    centered: { alignItems: 'center' as const, gap: 10, paddingVertical: 16 },
    muted: { fontSize: 14, color: theme.mutedText },
  };
}

export function createAdminPanelSearchStyleObjects(theme: ScreenTheme) {
  return {
    sectionHeader: { ...adminPanelSectionHeaderBase, marginTop: 8 },
    searchBlock: { marginBottom: 14 },
    searchLabel: { fontSize: 13, fontWeight: '600' as const, color: theme.secondaryText, marginBottom: 6 },
    searchInput: {
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.inputText,
      backgroundColor: theme.inputBg,
    },
  };
}

export function createAdminPanelSharedStyles(theme: ScreenTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.panelScreenBg,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    primaryButton: {
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.primaryBtnBg,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: theme.primaryBtnText,
      fontSize: 14,
      fontWeight: '600',
    },
    errorText: {
      color: theme.error,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.title,
    },
    sectionLink: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.link,
    },
    confirmBackdrop: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    confirmCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
    },
    confirmTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.title,
      marginBottom: 8,
    },
    confirmText: {
      fontSize: 14,
      color: theme.secondaryText,
      marginBottom: 18,
    },
    confirmActions: {
      flexDirection: 'row',
      gap: 10,
    },
    confirmCancel: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: theme.secondaryBtnBg,
      alignItems: 'center',
    },
    confirmCancelText: {
      color: theme.secondaryBtnText,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

export type AdminPanelSharedStyles = ReturnType<typeof createAdminPanelSharedStyles>;

type PanelStyleMap = Parameters<typeof StyleSheet.create>[0];

/** Shared panel chrome + screen-specific styles with a stable merged type. */
export function createAdminPanelScreenStyles<E extends PanelStyleMap>(
  theme: ScreenTheme,
  extra: E,
): AdminPanelSharedStyles & E {
  return Object.assign(
    {},
    createAdminPanelSharedStyles(theme),
    StyleSheet.create(extra),
  ) as AdminPanelSharedStyles & E;
}
