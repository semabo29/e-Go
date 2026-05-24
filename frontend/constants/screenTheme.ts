import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import type { SemanticColors } from '@/constants/accessibilityColors';

export type ScreenTheme = {
  isDark: boolean;
  sem: SemanticColors;
  containerBg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  title: string;
  body: string;
  secondaryText: string;
  mutedText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  footerBg: string;
  overlay: string;
  modalSurface: string;
  modalCloseBg: string;
  placeholder: string;
  accent: string;
  error: string;
  link: string;
  primaryBtnBg: string;
  primaryBtnText: string;
  secondaryBtnBg: string;
  secondaryBtnText: string;
  dangerBtnBg: string;
  dangerBtnText: string;
  panelScreenBg: string;
  googleBtnBg: string;
  googleBtnBorder: string;
  switchTrackFalse: string;
  textOnAccent: string;
  shopBg: string;
  shopCardBg: string;
  shopCardBorder: string;
  shopText: string;
  shopMuted: string;
  shopOwnedBtnBg: string;
};

function pick(isDark: boolean, light: string, dark: string): string {
  return isDark ? dark : light;
}

/** Main screen backdrop used across stack screens and tabs (dark = slate, not pure black). */
export const SCREEN_CONTAINER_BG = {
  light: '#f8fafc',
  dark: '#0f172a',
} as const;

/** Shared light/dark palette for stack screens (filters, profile, admin panels, login, shop). */
export function buildScreenTheme(isDark: boolean, sem: SemanticColors): ScreenTheme {
  return {
    isDark,
    sem,
    containerBg: pick(isDark, SCREEN_CONTAINER_BG.light, SCREEN_CONTAINER_BG.dark),
    surface: pick(isDark, '#ffffff', '#1e293b'),
    surfaceElevated: pick(isDark, '#ffffff', '#1e293b'),
    border: pick(isDark, '#e2e8f0', '#334155'),
    title: pick(isDark, '#1f2937', '#f1f5f9'),
    body: pick(isDark, '#334155', '#e2e8f0'),
    secondaryText: pick(isDark, '#475569', '#cbd5e1'),
    mutedText: pick(isDark, '#64748b', '#94a3b8'),
    inputBg: pick(isDark, '#ffffff', '#0f172a'),
    inputBorder: pick(isDark, '#cbd5e1', '#475569'),
    inputText: pick(isDark, '#1f2937', '#f1f5f9'),
    chipBg: pick(isDark, '#f1f5f9', '#334155'),
    chipBorder: pick(isDark, '#e2e8f0', '#475569'),
    chipText: pick(isDark, '#64748b', '#cbd5e1'),
    footerBg: pick(isDark, '#ffffff', '#1e293b'),
    overlay: pick(isDark, 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.55)'),
    modalSurface: pick(isDark, '#ffffff', '#1e293b'),
    modalCloseBg: pick(isDark, '#f1f5f9', '#334155'),
    placeholder: '#94a3b8',
    accent: sem.accent,
    error: sem.error,
    link: pick(isDark, '#2563eb', '#38bdf8'),
    primaryBtnBg: isDark ? sem.accent : '#111827',
    primaryBtnText: '#ffffff',
    secondaryBtnBg: pick(isDark, '#e5e7eb', '#334155'),
    secondaryBtnText: pick(isDark, '#111827', '#f1f5f9'),
    dangerBtnBg: pick(isDark, '#fee2e2', '#7f1d1d'),
    dangerBtnText: pick(isDark, '#b91c1c', '#fecaca'),
    panelScreenBg: pick(isDark, '#f5f5f5', '#0f172a'),
    googleBtnBg: pick(isDark, '#1e293b', '#ffffff'),
    googleBtnBorder: pick(isDark, '#475569', '#e5e7eb'),
    switchTrackFalse: pick(isDark, '#cbd5e1', '#475569'),
    textOnAccent: '#ffffff',
    shopBg: pick(isDark, '#f8fafc', '#121212'),
    shopCardBg: pick(isDark, '#ffffff', '#1e1e1e'),
    shopCardBorder: pick(isDark, '#e2e8f0', '#2c2c2c'),
    shopText: pick(isDark, '#111827', '#ffffff'),
    shopMuted: pick(isDark, '#64748b', '#aaaaaa'),
    shopOwnedBtnBg: pick(isDark, '#e2e8f0', '#444444'),
  };
}

/**
 * Map tab (index) palette — derived from {@link buildScreenTheme} with map-specific overrides.
 * Avoids a separate static light/dark object pair (Sonar CPD).
 */
export type InicioScreenPalette = {
  screenBg: string;
  mutedText: string;
  cardBg: string;
  titleText: string;
  subtitleText: string;
  border: string;
  inputBorder: string;
  textPrimary: string;
  textEmphasis: string;
  handle: string;
  infoTitle: string;
  promotorText: string;
  menuBackdrop: string;
  themeSegmentBg: string;
  themeOptionActiveBg: string;
  themeOptionText: string;
  themeOptionTextActive: string;
  errorBannerBg: string;
  reportBackdrop: string;
  formBorder: string;
  chipBg: string;
  chipText: string;
  secondaryButtonBg: string;
  secondaryButtonText: string;
  labelText: string;
};

export function buildInicioScreenPalette(isDark: boolean, sem: SemanticColors): InicioScreenPalette {
  const base = buildScreenTheme(isDark, sem);
  return {
    screenBg: pick(isDark, '#f5f5f5', SCREEN_CONTAINER_BG.dark),
    mutedText: base.mutedText,
    cardBg: base.surface,
    titleText: pick(isDark, '#1a1a1a', base.title),
    subtitleText: pick(isDark, '#6b7280', base.mutedText),
    border: base.border,
    inputBorder: pick(isDark, '#e5e7eb', base.border),
    textPrimary: pick(isDark, '#1f2937', base.title),
    textEmphasis: pick(isDark, '#111827', base.body),
    handle: pick(isDark, '#e2e8f0', base.chipBorder),
    infoTitle: pick(isDark, '#1e293b', base.title),
    promotorText: pick(isDark, '#94a3b8', base.secondaryText),
    menuBackdrop: base.overlay,
    themeSegmentBg: base.chipBg,
    themeOptionActiveBg: pick(isDark, '#ffffff', SCREEN_CONTAINER_BG.dark),
    themeOptionText: base.chipText,
    themeOptionTextActive: base.title,
    errorBannerBg: base.dangerBtnBg,
    reportBackdrop: pick(isDark, 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.6)'),
    formBorder: pick(isDark, '#d1d5db', base.chipBorder),
    chipBg: pick(isDark, '#f8fafc', base.chipBg),
    chipText: pick(isDark, '#4b5563', base.chipText),
    secondaryButtonBg: pick(isDark, '#f3f4f6', base.secondaryBtnBg),
    secondaryButtonText: pick(isDark, '#374151', base.secondaryBtnText),
    labelText: pick(isDark, '#374151', base.secondaryText),
  };
}

/** Align React Navigation chrome (tab/stack backgrounds) with app screen tokens. */
export function buildNavigationTheme(isDark: boolean, sem: SemanticColors): Theme {
  const screen = buildScreenTheme(isDark, sem);
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: screen.accent,
      background: screen.containerBg,
      card: screen.surface,
      text: screen.title,
      border: screen.border,
    },
  };
}
