import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { hydrateLocaleFromStorage } from './i18n';

export function I18nLocaleHydrator({ children }: { children: ReactNode }) {
  useEffect(() => {
    void hydrateLocaleFromStorage();
  }, []);
  return <>{children}</>;
}
