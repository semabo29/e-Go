import { describe, expect, test } from '@jest/globals';

import i18n from '@/i18n/i18n';
import {
  incidentStatusKey,
  incidentStatusLabel,
  incidentTypeLabel,
} from '@/utils/adminIncidentUi';

describe('adminIncidentUi', () => {
  test('status and type labels resolve in Spanish', async () => {
    await i18n.changeLanguage('es');
    const inc = {
      rebutjada: false,
      resolta: false,
      validada: true,
      tipus: 'Operatiu',
    } as Parameters<typeof incidentStatusLabel>[0];

    expect(incidentStatusKey(inc)).toBe('validated');
    expect(incidentStatusLabel(inc, i18n.t.bind(i18n))).toBe('Validada');
    expect(incidentTypeLabel('Operatiu', i18n.t.bind(i18n))).toBe('Operativa');
  });
});
