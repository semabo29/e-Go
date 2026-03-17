// Login solo con Google; si es usuario nuevo pedimos username y registramos
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { API_URL, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import { Colors } from '@/constants/theme';

const BRAND_GREEN = Colors.light.tint;
const LOGO = require('./_assets/favicon.png');

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const { setUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'google' | 'username'>('google');
  const [pendingAuth, setPendingAuth] = useState<{ pending_token: string } | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        setError('No se pudo obtener el token de Google');
        return;
      }

      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      if (data.user) {
        setUser(data.user);
        router.replace('/(tabs)');
        return;
      }
      if (data.needsUsername && data.pending_token) {
        setPendingAuth({ pending_token: data.pending_token });
        setStep('username');
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // usuario canceló, no mostramos error
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Ya hay un inicio de sesión en curso');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services no disponible');
      } else {
        setError('No se pudo conectar con el servidor');
        console.error('[Google Login]', err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function registerWithUsername() {
    if (!pendingAuth || !username.trim()) return;
    const name = username.trim();
    if (name.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_token: pendingAuth.pending_token,
          username: name,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al registrarse');
        return;
      }
      if (data.user) {
        setUser(data.user);
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  // Paso 2: elegir nombre de usuario
  if (step === 'username') {
    return (
      <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
        <View style={styles.card}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Elige tu nombre de usuario</Text>
          <Text style={styles.subtitle}>Así aparecerás en la aplicación</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={(t) => { setUsername(t); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={registerWithUsername}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Continuar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => { setStep('google'); setPendingAuth(null); setUsername(''); setError(''); }}
            disabled={loading}
          >
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Pantalla principal
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Bienvenido a e-Go</Text>
        <Text style={styles.subtitle}>Tu navegador de estaciones de carga en Catalunya</Text>

        {!GOOGLE_WEB_CLIENT_ID ? (
          <Text style={styles.errorText}>
            Configura EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en el .env del frontend
          </Text>
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#3c4043" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.terms}>
          Al continuar, aceptas nuestros términos y condiciones
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 40 },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16,
    padding: 28, alignItems: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  logo: { width: 180, height: 180, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 28 },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    width: '100%', paddingVertical: 14, paddingHorizontal: 24,
    backgroundColor: '#fff', borderRadius: 0, borderWidth: 1, borderColor: '#e5e7eb',
  },
  googleIcon: { width: 22, height: 22 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  primaryButton: { width: '100%', paddingVertical: 14, borderRadius: 10, backgroundColor: BRAND_GREEN, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  input: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 14, color: '#6b7280' },
  terms: { marginTop: 24, fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});