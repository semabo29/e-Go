import { useThemePreference } from '@/contexts/ThemePreferenceContext';

export function useColorScheme() {
  const { resolvedScheme } = useThemePreference();
  return resolvedScheme;
}
