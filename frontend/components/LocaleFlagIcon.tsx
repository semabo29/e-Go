import { View, StyleSheet } from 'react-native';

import type { AppLocale } from '@/i18n/i18n';

const SENYERA = ['#FCDD09', '#DA121A', '#FCDD09', '#DA121A', '#FCDD09', '#DA121A', '#FCDD09', '#DA121A', '#FCDD09'] as const;

type Props = Readonly<{
  locale: AppLocale;
  size?: number;
}>;

/** Banderas dibujadas (sin emojis) para el selector de idioma. */
export function LocaleFlagIcon({ locale, size = 24 }: Props) {
  const r = size / 2;

  if (locale === 'ca') {
    return (
      <View
        style={[
          styles.circle,
          styles.column,
          { width: size, height: size, borderRadius: r },
        ]}
      >
        {SENYERA.map((color, index) => (
          <View key={`senyera-${color}-${index}`} style={[styles.senyeraStripe, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  if (locale === 'es') {
    return (
      <View
        style={[
          styles.circle,
          styles.column,
          { width: size, height: size, borderRadius: r },
        ]}
      >
        <View style={[styles.hBand, { flex: 1, backgroundColor: '#AA151B' }]} />
        <View style={[styles.hBand, { flex: 2, backgroundColor: '#F1BF00' }]} />
        <View style={[styles.hBand, { flex: 1, backgroundColor: '#AA151B' }]} />
      </View>
    );
  }

  if (locale === 'it') {
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: r, flexDirection: 'row' }]}>
        <View style={[styles.vBand, { flex: 1, backgroundColor: '#009246' }]} />
        <View style={[styles.vBand, { flex: 1, backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.vBand, { flex: 1, backgroundColor: '#CE2B37' }]} />
      </View>
    );
  }

  // en — Union Jack simplificado
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: r, backgroundColor: '#012169' }]}>
      <View style={[styles.ukHWhite, { height: size * 0.36, marginTop: size * 0.32 }]} />
      <View style={[styles.ukVWhite, { width: size * 0.36, marginLeft: size * 0.32 }]} />
      <View style={[styles.ukHRed, { height: size * 0.2, marginTop: size * 0.4 }]} />
      <View style={[styles.ukVRed, { width: size * 0.2, marginLeft: size * 0.4 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
  },
  column: {
    flexDirection: 'column',
  },
  senyeraStripe: {
    flex: 1,
    width: '100%',
  },
  hBand: {
    width: '100%',
  },
  vBand: {
    height: '100%',
  },
  ukHWhite: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  ukVWhite: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  ukHRed: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#C8102E',
  },
  ukVRed: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#C8102E',
  },
});
