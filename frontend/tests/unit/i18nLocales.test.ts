import { describe, test, expect } from '@jest/globals';

import es from '@/i18n/locales/es';
import ca from '@/i18n/locales/ca';
import en from '@/i18n/locales/en';
import it from '@/i18n/locales/it';
import i18n from '@/i18n/i18n';

type NestedRecord = Record<string, unknown>;

function flattenKeys(obj: NestedRecord, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as NestedRecord, path);
    }
    return [path];
  });
}

const locales = { es, ca, en, it } as const;

describe('i18n locales', () => {
  test.each(Object.entries(locales))('%s locale is a non-null object', (_code, bundle) => {
    expect(typeof bundle).toBe('object');
    expect(bundle).not.toBeNull();
  });

  test('ca, en and it expose the same keys as es', () => {
    const esKeys = flattenKeys(es as NestedRecord).sort();
    expect(flattenKeys(ca as NestedRecord).sort()).toEqual(esKeys);
    expect(flattenKeys(en as NestedRecord).sort()).toEqual(esKeys);
    expect(flattenKeys(it as NestedRecord).sort()).toEqual(esKeys);
  });

  test('userProfile and favorites keys resolve in all languages', async () => {
    const keys = [
      'userProfile.shareProfile',
      'userProfile.receivedRequests',
      'favorites.headerSubtitle',
      'navigation.calculatingRoute',
      'shop.title',
      'adminIncidents.title',
      'adminUsers.title',
      'adminHome.reviewRequests',
    ] as const;

    for (const lng of ['es', 'ca', 'en', 'it'] as const) {
      await i18n.changeLanguage(lng);
      for (const key of keys) {
        const value = i18n.t(key, { count: 2, id: 9 });
        expect(value).toBeTruthy();
        expect(value).not.toBe(key);
      }
    }

    await i18n.changeLanguage('es');
  });
});
