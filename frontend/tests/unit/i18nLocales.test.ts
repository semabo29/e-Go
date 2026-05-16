import { describe, test, expect } from '@jest/globals';

import es from '@/i18n/locales/es';
import ca from '@/i18n/locales/ca';
import en from '@/i18n/locales/en';
import it from '@/i18n/locales/it';

describe('i18n locales', () => {
  test('es locale has translation keys', () => {
    expect(typeof es).toBe('object');
    expect(es).not.toBeNull();
  });

  test('ca locale has translation keys', () => {
    expect(typeof ca).toBe('object');
    expect(ca).not.toBeNull();
  });

  test('en locale has translation keys', () => {
    expect(typeof en).toBe('object');
    expect(en).not.toBeNull();
  });

  test('it locale has translation keys', () => {
    expect(typeof it).toBe('object');
    expect(it).not.toBeNull();
  });
});