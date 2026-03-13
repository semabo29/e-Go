// Login solo con Google; si es usuario nuevo pedimos username y registramos
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

WebBrowser.maybeCompleteAuthSession();

const BRAND_GREEN = Colors.light.tint;
const LOGO = require('./_assets/favicon.png');

export default function LoginScreen() {
  const { setUser } = useAuth();
  const router = useRouter();
  const { openGoogle } = useLocalSearchParams<{ openGoogle?: string }>();
  const [step, setStep] = useState<'google' | 'username'>('google');
  const [pendingAuth, setPendingAuth] = useState<{ pending_token: string } | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleFlowStarted, setGoogleFlowStarted] = useState(false);
  const openedGoogleRef = useRef(false);

  const discovery = useAutoDiscovery('https://accounts.google.com');
  const redirectUri = makeRedirectUri({ scheme: 'frontend' });

  useEffect(() => {
    if (redirectUri) console.log('[e-Go] URI para Google Cloud:', redirectUri);
  }, [redirectUri]);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
    },
    discovery ?? null
  );

  useEffect(() => {
    if (response?.type !== 'success' || !request) return;
    const { code } = response.params;
    const verifier = (request as { codeVerifier?: string }).codeVerifier;
    if (!code) return;
    loginWithCode(code, redirectUri, verifier);
  }, [response]);

  // Si vienes desde Home con openGoogle, abre Google al entrar (sin tener que pulsar otra vez)
  useEffect(() => {
    if (openGoogle === '1' && request && !openedGoogleRef.current) {
      openedGoogleRef.current = true;
      setGoogleFlowStarted(true);
      promptAsync();
    }
  }, [openGoogle, request]);

  async function loginWithCode(code: string, redirectUri: string, codeVerifier?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri, code_verifier: codeVerifier }),
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
    } catch (err) {
      setError('No se pudo conectar con el servidor. Comprueba la URL del backend.');
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

  // Paso 2: elegir nombre de usuario (mismo estilo blanco)
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
            style={[styles.primaryButton]}
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

  // Pantalla principal: solo Google (mockup)
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Bienvenido a e-Go</Text>
        <Text style={styles.subtitle}>Tu navegador de estaciones de carga en Catalunya</Text>

        {!googleFlowStarted && (
          <TouchableOpacity
            style={styles.adminLink}
            onPress={() => router.push('/admin-login')}
            disabled={loading}
          >
            <Text style={styles.adminLinkText}>Acceso Admin</Text>
          </TouchableOpacity>
        )}

        {!GOOGLE_WEB_CLIENT_ID ? (
          <Text style={styles.errorText}>
            Configura EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en el .env del frontend
          </Text>
        ) : openGoogle === '1' ? (
          <View style={styles.openingGoogle}>
            <ActivityIndicator size="large" color={BRAND_GREEN} />
            <Text style={styles.openingGoogleText}>Iniciando sesión…</Text>
          </View>
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => { setGoogleFlowStarted(true); promptAsync(); }}
              disabled={!request || loading}
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
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  adminLink: {
    marginTop: 18,
  },
  adminLinkText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  openingGoogle: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  openingGoogleText: {
    fontSize: 16,
    color: '#6b7280',
  },
  terms: {
    marginTop: 24,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
