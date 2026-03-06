// Auth global: user, setUser, logout. Guardamos en AsyncStorage para mantener sesión
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const USER_STORAGE_KEY = '@ego_user';

export type User = {
  id: number;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al abrir, cargamos usuario guardado
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (json) {
          const saved = JSON.parse(json) as User;
          setUserState(saved);
        }
      } catch (e) {
        // fallo de lectura: seguimos sin usuario
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    } else {
      AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    AsyncStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
