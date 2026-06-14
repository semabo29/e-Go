import { useMemo } from 'react';

import { getSemanticColors } from '@/constants/accessibilityColors';
import { buildScreenTheme, type ScreenTheme } from '@/constants/screenTheme';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useScreenTheme(): ScreenTheme {
  const colorScheme = useColorScheme();
  const { colorblindFriendly } = useColorblindPreference();
  const isDark = colorScheme === 'dark';
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  return useMemo(() => buildScreenTheme(isDark, sem), [isDark, colorblindFriendly, sem]);
}
