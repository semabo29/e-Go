/**
 * Semantic colors for default UI vs. colorblind-friendly mode.
 * In colorblind mode we avoid red/green/yellow-only distinctions for map pins and key accents.
 */

export type SemanticColors = {
  accent: string;
  favorite: string;
  error: string;
  /** Station markers: favorite / non-operational / operational */
  mapFavorite: string;
  mapInactive: string;
  mapOk: string;
  mapCustomLocation: string;
  mapRouteDestination: string;
  routeLine: string;
  /** Report modal chip selected */
  chipActiveBg: string;
  chipActiveText: string;
  /** Error banner text (light / dark bg) */
  errorTextLight: string;
  errorTextDark: string;
  /** Info badges (kW, connector…) */
  badgeBg: string;
  badgeIcon: string;
  badgeLabel: string;
};

export function getSemanticColors(colorblind: boolean): SemanticColors {
  if (!colorblind) {
    return {
      accent: '#10b981',
      favorite: '#ef4444',
      error: '#ef4444',
      mapFavorite: 'red',
      mapInactive: 'yellow',
      mapOk: 'green',
      mapCustomLocation: '#f59e0b',
      mapRouteDestination: '#a855f7',
      routeLine: '#3b82f6',
      chipActiveBg: '#ecfdf5',
      chipActiveText: '#047857',
      errorTextLight: '#ef4444',
      errorTextDark: '#fecaca',
      badgeBg: '#ecfdf5',
      badgeIcon: '#10b981',
      badgeLabel: '#047857',
    };
  }

  return {
    accent: '#0ea5e9',
    favorite: '#a855f7',
    error: '#c2410c',
    mapFavorite: '#a855f7',
    mapInactive: '#ea580c',
    mapOk: '#0284c7',
    mapCustomLocation: '#f97316',
    mapRouteDestination: '#7c3aed',
    routeLine: '#2563eb',
    chipActiveBg: '#e0f2fe',
    chipActiveText: '#0369a1',
    errorTextLight: '#9a3412',
    errorTextDark: '#fdba74',
    badgeBg: '#e0f2fe',
    badgeIcon: '#0ea5e9',
    badgeLabel: '#0369a1',
  };
}

/** Confetti / premium welcome modal: greens → cyans when colorblind. */
export type PremiumModalPalette = {
  eyebrow: string;
  titleAccent: string;
  divider: string;
  caption: string;
  streak: string;
  perkRowBg: string;
  perkRowBorder: string;
  perkIconBg: string;
  perkLabel: string;
  perkCheckStroke: string;
  ctaBg: string;
  ctaShadow: string;
  ctaText: string;
  ringOVisible: string;
  ringIVisible: string;
  ringTransparent: string;
  dot: string;
  shieldWrapShadow: string;
  shieldFillTop: string;
  shieldFillBottom: string;
  shieldInnerTop: string;
  shieldInnerBottom: string;
  shieldStroke: string;
  confetti: string[];
};

export function getPremiumModalPalette(colorblind: boolean): PremiumModalPalette {
  if (!colorblind) {
    return {
      eyebrow: '#4ade80',
      titleAccent: '#86efac',
      divider: '#4ade80',
      caption: '#a7f3d0',
      streak: 'rgba(134,239,172,0.055)',
      perkRowBg: 'rgba(74,222,128,0.06)',
      perkRowBorder: 'rgba(74,222,128,0.15)',
      perkIconBg: 'rgba(74,222,128,0.18)',
      perkLabel: '#d1fae5',
      perkCheckStroke: '#4ade80',
      ctaBg: '#22c55e',
      ctaShadow: '#22c55e',
      ctaText: '#052e16',
      ringOVisible: 'rgba(74,222,128,0.22)',
      ringIVisible: 'rgba(74,222,128,0.15)',
      ringTransparent: 'rgba(74,222,128,0)',
      dot: '#4ade80',
      shieldWrapShadow: '#22c55e',
      shieldFillTop: '#4ade80',
      shieldFillBottom: '#15803d',
      shieldInnerTop: '#166534',
      shieldInnerBottom: '#14532d',
      shieldStroke: 'rgba(134,239,172,0.45)',
      confetti: [
        '#fef08a',
        '#86efac',
        '#4ade80',
        '#fbbf24',
        '#34d399',
        '#ffffff',
        '#a7f3d0',
        '#fde68a',
        '#bef264',
      ],
    };
  }

  return {
    eyebrow: '#38bdf8',
    titleAccent: '#7dd3fc',
    divider: '#0ea5e9',
    caption: '#bae6fd',
    streak: 'rgba(14,165,233,0.09)',
    perkRowBg: 'rgba(14,165,233,0.08)',
    perkRowBorder: 'rgba(14,165,233,0.2)',
    perkIconBg: 'rgba(14,165,233,0.22)',
    perkLabel: '#e0f2fe',
    perkCheckStroke: '#0ea5e9',
    ctaBg: '#0ea5e9',
    ctaShadow: '#0284c7',
    ctaText: '#0c4a6e',
    ringOVisible: 'rgba(14,165,233,0.22)',
    ringIVisible: 'rgba(14,165,233,0.15)',
    ringTransparent: 'rgba(14,165,233,0)',
    dot: '#38bdf8',
    shieldWrapShadow: '#0ea5e9',
    shieldFillTop: '#38bdf8',
    shieldFillBottom: '#0369a1',
    shieldInnerTop: '#0369a1',
    shieldInnerBottom: '#0c4a6e',
    shieldStroke: 'rgba(125,211,252,0.5)',
    confetti: [
      '#fef08a',
      '#7dd3fc',
      '#38bdf8',
      '#fbbf24',
      '#0ea5e9',
      '#ffffff',
      '#bae6fd',
      '#fde68a',
      '#a855f7',
    ],
  };
}
