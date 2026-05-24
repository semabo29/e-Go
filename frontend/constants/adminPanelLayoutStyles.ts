/**
 * Shared layout + modal chrome for admin panel screens (card on grey background,
 * primary CTA, confirmation dialog). Keeps StyleSheet keys aligned across screens.
 */

import { StyleSheet } from 'react-native';

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

export const adminPanelSharedStyles = {
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: '#4b5563',
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
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
};

/** Registered once; merge per-screen with `Object.assign({}, adminPanelSharedSheet, …)`. */
export const adminPanelSharedSheet = StyleSheet.create(adminPanelSharedStyles as never);