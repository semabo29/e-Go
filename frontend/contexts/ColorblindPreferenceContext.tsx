import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ColorblindPreferenceContextValue = {
  colorblindFriendly: boolean;
  setColorblindFriendly: (value: boolean) => void;
  isLoaded: boolean;
};

const STORAGE_KEY = 'colorblind-friendly-v1';

const ColorblindPreferenceContext = createContext<ColorblindPreferenceContextValue | null>(null);

export function ColorblindPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [colorblindFriendly, setState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw === '1') setState(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setColorblindFriendly = useCallback((value: boolean) => {
    setState(value);
    AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      colorblindFriendly,
      setColorblindFriendly,
      isLoaded: loaded,
    }),
    [colorblindFriendly, loaded, setColorblindFriendly]
  );

  return (
    <ColorblindPreferenceContext.Provider value={value}>{children}</ColorblindPreferenceContext.Provider>
  );
}

export function useColorblindPreference(): ColorblindPreferenceContextValue {
  const context = useContext(ColorblindPreferenceContext);
  if (context) return context;
  return {
    colorblindFriendly: false,
    setColorblindFriendly: () => {},
    isLoaded: true,
  };
}
