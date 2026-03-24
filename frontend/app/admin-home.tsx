import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getApiUrl } from '@/constants/api';

const ADMIN_TOKEN_KEY = '@ego_admin_token';
const ADMIN_USER_KEY = '@ego_admin_user';

type AdminPayload = {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export default function AdminHomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) {
          setError('No hay sesion admin');
          return;
        }
        const res = await fetch(`${getApiUrl()}/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'No autorizado');
          return;
        }
        setAdmin(data.admin);
      } catch (err) {
        setError('No se pudo conectar con el servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logoutAdmin() {
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    await AsyncStorage.removeItem(ADMIN_USER_KEY);
    router.replace('/admin-login');
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Home</Text>
        <Text style={styles.subtitle}>Comprobacion de acceso admin</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.muted}>Verificando token…</Text>
          </View>
        ) : error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/admin-login')}>
              <Text style={styles.primaryButtonText}>Volver al login admin</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{admin?.email}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Rol</Text>
              <Text style={styles.infoValue}>{admin?.role}</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={logoutAdmin}>
              <Text style={styles.secondaryButtonText}>Cerrar sesion admin</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 22,
  },
  centered: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  infoBox: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
