// Login empresa: email/contraseña o Google; JWT para portal empresa
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GOOGLE_WEB_CLIENT_ID, getApiUrl } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { savePrivilegedSession } from '@/services/privilegedAuth';

WebBrowser.maybeCompleteAuthSession();

const BRAND_GREEN = Colors.light.tint;
const LOGO = require('./_assets/favicon.png');
const IS_WEB = Platform.OS === 'web';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

type CompanyUser = {
  id: number;
  user_id: number;
  email: string;
  username: string;
  nombre?: string | null;
  company_since?: string;
};

export default function CompanyLoginScreen() {
  const router = useRouter();
  const { openGoogle } = useLocalSearchParams<{ openGoogle?: string }>();
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState<CompanyUser | null>(null);
  const openedGoogleRef = useRef(false);

  const discovery = useAutoDiscovery('https://accounts.google.com');
  const redirectUri = makeRedirectUri({ scheme: 'frontend' });
  const [request, response, promptAsync] = useAuthRequest(
    { clientId: GOOGLE_WEB_CLIENT_ID, scopes: ['openid', 'email', 'profile'], redirectUri },
    discovery ?? null
  );

  useEffect(() => {
    if (!IS_WEB) return;
    if (response?.type !== 'success' || !request) return;
    const code = response.params.code;
    const verifier = (request as { codeVerifier?: string }).codeVerifier;
    if (code) loginWithCode(code, redirectUri, verifier);
  }, [response]);

  useEffect(() => {
    if (!IS_WEB) return;
    if (openGoogle === '1' && request && !openedGoogleRef.current) {
      openedGoogleRef.current = true;
      promptAsync();
    }
  }, [openGoogle, request]);

  async function onLoginOk(data: { company: CompanyUser; token: string }) {
    await savePrivilegedSession('company', { token: data.token, user: data.company });
    router.replace('/company-home' as Href);
  }

  async function submitCompanyLocalLogin() {
    if (!email.trim() || !password) {
      setError('Email y contraseña son obligatorios');
      return;
    }
    setLocalLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/auth/company/local/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = [data.error, data.message].filter(Boolean).join(' — ');
        setError(detail || 'Error al iniciar sesión');
        return;
      }
      if (data.company && data.token) {
        setCompany(data.company);
        await onLoginOk(data);
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Comprueba la URL del backend.');
    } finally {
      setLocalLoading(false);
    }
  }

  async function loginWithIdToken(idToken: string) {
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/auth/company/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesion empresa');
        return;
      }
      if (data.company && data.token) {
        setCompany(data.company);
        await onLoginOk(data);
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Comprueba la URL del backend.');
    }
  }

  async function loginWithCode(code: string, redirectUriValue: string, codeVerifier?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/auth/company/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: redirectUriValue, code_verifier: codeVerifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesion empresa');
        return;
      }
      if (data.company && data.token) {
        setCompany(data.company);
        await onLoginOk(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (IS_WEB) {
      promptAsync();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any).data?.idToken ?? (userInfo as any).idToken;
      if (!idToken) {
        setError('No se pudo obtener el token de Google');
        return;
      }
      await loginWithIdToken(idToken);
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err?.code === statusCodes.IN_PROGRESS) setError('Ya hay un inicio de sesion en curso');
      else setError(err instanceof Error ? err.message : 'Error al conectar con Google');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Acceso Empresa</Text>
        <Text style={styles.subtitle}>Gestion de solicitudes de estaciones</Text>

        {!GOOGLE_WEB_CLIENT_ID ? (
          <Text style={styles.hintText}>
            Para continuar con Google, configura EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en el .env del frontend.
          </Text>
        ) : null}

        {company ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Sesion iniciada</Text>
            <Text style={styles.successText}>{company.email}</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/(tabs)' as Href)}
            >
              <Text style={styles.secondaryButtonText}>Ir a la app</Text>
            </TouchableOpacity>
          </View>
        ) : openGoogle === '1' && IS_WEB ? (
          <View style={styles.openingGoogle}>
            <ActivityIndicator size="large" color={BRAND_GREEN} />
            <Text style={styles.openingGoogleText}>Iniciando sesion…</Text>
          </View>
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.localForm}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submitCompanyLocalLogin}
                disabled={localLoading || loading}
                activeOpacity={0.85}
              >
                {localLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.separatorText}>o</Text>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleLogin}
              disabled={!GOOGLE_WEB_CLIENT_ID || (IS_WEB && !request) || loading || localLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#3c4043" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
                    }}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/login' as Href)}>
          <Text style={styles.backLinkText}>Volver al login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 40 },
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
  logo: { width: 160, height: 160, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  hintText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  localForm: { width: '100%', alignSelf: 'stretch' },
  input: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginBottom: 12,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    marginBottom: 4,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  separatorText: { marginVertical: 14, color: '#6b7280', fontSize: 14, fontWeight: '600' },
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
  googleIcon: { width: 22, height: 22 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  openingGoogle: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  openingGoogleText: { fontSize: 16, color: '#6b7280' },
  successBox: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  successText: { fontSize: 14, color: '#374151' },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  secondaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  backLink: { marginTop: 20 },
  backLinkText: { fontSize: 14, color: '#6b7280' },
});
