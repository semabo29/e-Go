import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';

import { LocaleFlagIcon } from '@/components/LocaleFlagIcon';

describe('LocaleFlagIcon', () => {
  test.each(['es', 'ca', 'en', 'it'] as const)('renderiza bandera %s sin error', (locale) => {
    const { toJSON } = render(<LocaleFlagIcon locale={locale} size={28} />);
    expect(toJSON()).toBeTruthy();
  });

  test('bandera catalana difiere de la española en estructura', () => {
    const caTree = render(<LocaleFlagIcon locale="ca" size={36} />).toJSON();
    const esTree = render(<LocaleFlagIcon locale="es" size={36} />).toJSON();
    expect(JSON.stringify(caTree)).not.toEqual(JSON.stringify(esTree));
  });
});
