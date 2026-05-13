/**
 * Comprueba que las paletas semánticas (mapa, chips, modal premium) cambian de forma
 * coherente al activar el modo accesible para daltonismo, sin depender de React.
 */
import { describe, expect, test } from '@jest/globals';

import { getPremiumModalPalette, getSemanticColors } from '@/constants/accessibilityColors';

describe('getSemanticColors', () => {
  // Contrato del mapa en modo normal: colores habituales de favorito / inactivo / OK.
  test('modo estándar: pins del mapa usan rojo / amarillo / verde', () => {
    const c = getSemanticColors(false);
    expect(c.mapFavorite).toBe('red');
    expect(c.mapInactive).toBe('yellow');
    expect(c.mapOk).toBe('green');
  });

  // En modo accesible los pins no deben depender solo de rojo/verde/amarillo.
  test('modo accesible: evita rojo/verde/amarillo como única distinción en pins', () => {
    const c = getSemanticColors(true);
    expect(c.mapFavorite).not.toBe('red');
    expect(c.mapInactive).not.toBe('yellow');
    expect(c.mapOk).not.toBe('green');
    expect(c.mapFavorite).toBe('#a855f7');
    expect(c.mapOk).toBe('#0284c7');
    expect(c.mapInactive).toBe('#ea580c');
  });

  // Acentos de UI (no solo el mapa) también deben desacoplarse del verde/rojo por defecto.
  test('modo accesible: acento y favorito difieren del modo estándar', () => {
    const def = getSemanticColors(false);
    const cb = getSemanticColors(true);
    expect(cb.accent).not.toBe(def.accent);
    expect(cb.favorite).not.toBe(def.favorite);
  });
});

describe('getPremiumModalPalette', () => {
  // Modal premium en modo normal: identidad verde / confeti con verdes.
  test('modo estándar: CTA y acentos en verdes', () => {
    const p = getPremiumModalPalette(false);
    expect(p.ctaBg).toBe('#22c55e');
    expect(p.confetti).toContain('#4ade80');
  });

  // Con daltonismo activo el modal debe basarse en cianes para no confundir con rojo/verde.
  test('modo accesible: CTA y paleta pasan a cianes / azules', () => {
    const p = getPremiumModalPalette(true);
    expect(p.ctaBg).toBe('#0ea5e9');
    expect(p.confetti).not.toContain('#4ade80');
    expect(p.confetti).toContain('#0ea5e9');
  });
});
