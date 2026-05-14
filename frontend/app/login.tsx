import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Href, useRouter, useLocalSearchParams } from 'expo-router'; 
import { useState, useEffect, useMemo } from 'react';
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
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { getApiUrl, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import { getSemanticColors } from '@/constants/accessibilityColors';

const LOGO = require('./_assets/favicon.png');

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const { setUser } = useAuth();
  const { colorblindFriendly } = useColorblindPreference();
  const brandAccent = useMemo(() => getSemanticColors(colorblindFriendly).accent, [colorblindFriendly]);
  const router = useRouter();
  const { openGoogle, mode } = useLocalSearchParams<{ openGoogle?: string; mode?: string }>();
  const [authMode, setAuthMode] = useState<'google' | 'local-login' | 'local-register'>('google');
  const [step, setStep] = useState<'google' | 'username'>('google');
  const [pendingAuth, setPendingAuth] = useState<{ pending_token: string } | null>(null);
  const [username, setUsername] = useState('');
  const [localUsername, setLocalUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function continueWithoutGoogleTemporarily() {
    const now = new Date().toISOString();
    setUser({
      id: 2,
      email: 'guest@ego.app',
      username: 'Guest User',
      created_at: now,
      updated_at: now,
    });
    router.replace('/(tabs)');
  }

  // ESTA ES LA ÚNICA FUNCIÓN QUE NECESITAS PARA LOGUEARTE
  async function handleNativeLogin() {
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

      let res: Response;
      try {
        res = await fetch(`${getApiUrl()}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (fetchErr: any) {
        const msg = fetchErr?.message || String(fetchErr);
        const base = getApiUrl();
        console.error('[Login] fetch /auth/google:', fetchErr, '→ URL:', `${base}/auth/google`);
        if (msg.includes('Network request failed')) {
          setError(
            __DEV__
              ? `No llega al backend. URL usada: ${base}. Con USB usa npm run start:usb (cierra Metro y vuelve a abrir), adb reverse y backend en marcha en el PC.`
              : 'No llega al backend. Comprueba conexión y que el servidor esté en marcha.'
          );
        } else {
          setError('No se pudo conectar con el servidor.');
        }
        return;
      }

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
        setError('');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Ya hay un inicio de sesión en curso');
      } else {
        setError('Error al conectar con Google');
        console.error('[Google Native Error]', err);
      }
    } finally {
      setLoading(false);
    }
  }

  // Si vienes de Home, mostramos Google pero sin auto-login.
  useEffect(() => {
    if (openGoogle === '1') {
      setAuthMode('google');
      return;
    }
    if (mode === 'register') {
      setAuthMode('local-register');
      return;
    }
    if (mode === 'login') {
      setAuthMode('local-login');
    }
  }, [openGoogle, mode]);

  async function registerWithUsername() {
    if (!pendingAuth || !username.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_token: pendingAuth.pending_token,
          username: username.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        router.replace('/(tabs)');
      } else {
        setError(data.error || 'Error al registrarse');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function submitLocalAuth() {
    if (!email.trim() || !password.trim()) {
      setError('Email y contraseña son obligatorios');
      return;
    }
    if (authMode === 'local-register' && !localUsername.trim()) {
      setError('El nombre de usuario es obligatorio');
      return;
    }
    if (authMode === 'local-register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const endpoint = authMode === 'local-register' ? '/auth/local/register' : '/auth/local/login';
      const body =
        authMode === 'local-register'
          ? { email: email.trim(), password, username: localUsername.trim() }
          : { email: email.trim(), password };
      const res = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión');
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
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: brandAccent }]} onPress={registerWithUsername} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continuar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={[styles.card, authMode === 'local-register' && styles.cardCompact]}>
        <Image
          source={LOGO}
          style={[styles.logo, authMode === 'local-register' && styles.logoCompact]}
          resizeMode="contain"
        />
        <Text style={styles.title}>Bienvenido a e-Go</Text>

        <View style={styles.linksRow}>
          <TouchableOpacity style={styles.adminLink} onPress={() => router.push('/company-login' as Href)}>
            <Text style={styles.adminLinkText}>Acceso Empresa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminLink} onPress={() => router.push('/admin-login')}>
            <Text style={styles.adminLinkText}>Acceso Admin</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {authMode === 'google' ? (
          <>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleNativeLogin}
              disabled={loading}
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

            <Text style={styles.separatorText}>o</Text>

            <TouchableOpacity
              style={[styles.primaryButton, styles.mailButton, { backgroundColor: brandAccent }]}
              onPress={() => {
                setAuthMode('local-login');
                setError('');
              }}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Mail y contraseña</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.googleButton, styles.skipGoogleButton]}
              onPress={continueWithoutGoogleTemporarily}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleButtonText}>Continuar sin Google</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.localForm}>
            <Text style={styles.localTitle}>Registro</Text>
            {authMode === 'local-register' ? (
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
                placeholderTextColor="#9ca3af"
                value={localUsername}
                onChangeText={setLocalUsername}
                autoCapitalize="none"
              />
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
            />
            {authMode === 'local-register' ? (
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            ) : null}
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: brandAccent }]} onPress={submitLocalAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {authMode === 'local-register' ? 'Crear cuenta' : 'Iniciar sesión'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchModeButton, styles.switchModeButtonPrimary]}
              onPress={() =>
                setAuthMode(authMode === 'local-register' ? 'local-login' : 'local-register')
              }
            >
              <Text style={styles.switchModeText}>
                {authMode === 'local-register'
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate con mail'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchModeButton, styles.switchModeButtonSecondary]}
              onPress={() => setAuthMode('google')}
              disabled={loading}
            >
              <Text style={styles.backGoogleText}>Continuar con Google</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.terms}>Al continuar, aceptas nuestros términos y condiciones</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingVertical: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 3 },
  cardCompact: { paddingVertical: 18, paddingHorizontal: 20 },
  logo: { width: 132, height: 132, marginBottom: 10 },
  logoCompact: { width: 100, height: 100, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  skipGoogleButton: { marginTop: 10 },
  googleIcon: { width: 22, height: 22 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  primaryButton: { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  separatorText: { marginTop: 12, marginBottom: 8, color: '#6b7280', fontSize: 14, fontWeight: '600' },
  mailButton: { marginTop: 0, marginBottom: 4 },
  input: { width: '100%', paddingVertical: 11, paddingHorizontal: 14, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  linksRow: { flexDirection: 'row', gap: 16, marginBottom: 18 },
  adminLink: {},
  adminLinkText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  localForm: {
    width: '100%',
  },
  localTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 14, textAlign: 'center' },
  switchModeButton: {
    marginTop: 10,
    alignSelf: 'stretch',
    minHeight: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  switchModeButtonPrimary: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  switchModeButtonSecondary: {
    marginTop: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  switchModeText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600',
  },
  backGoogleText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  terms: { marginTop: 24, fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});