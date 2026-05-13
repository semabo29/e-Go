import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedScheme: 'light' | 'dark';
  setPreference: (nextPreference: ThemePreference) => void;
  isLoaded: boolean;
};

const STORAGE_KEY = 'theme-preference-v1';

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return;
        if (storedPreference === 'light' || storedPreference === 'dark') {
          setPreferenceState(storedPreference);
        }
      } catch (_error) {
        // Ignore read errors and fallback to light.
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    loadPreference();
    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    AsyncStorage.setItem(STORAGE_KEY, nextPreference).catch(() => {
      // Ignore write errors to avoid blocking theme switching.
    });
  }, []);

  const resolvedScheme: 'light' | 'dark' = useMemo(() => preference, [preference]);

  const contextValue = useMemo(
    () => ({
      preference,
      resolvedScheme,
      setPreference,
      isLoaded,
    }),
    [isLoaded, preference, resolvedScheme, setPreference]
  );

  return <ThemePreferenceContext.Provider value={contextValue}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (context) return context;
  return {
    preference: 'light' as ThemePreference,
    resolvedScheme: 'light' as const,
    setPreference: () => {},
    isLoaded: true,
  };
}
