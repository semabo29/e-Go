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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { getApiUrl, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import { appFetch } from '@/services/appFetch';
import { Colors } from '@/constants/theme';
import { getSemanticColors } from '@/constants/accessibilityColors';

const LOGO = require('./_assets/favicon.png');

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const { t } = useTranslation();
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
  /** true = ocultar con puntos (secureTextEntry), false = texto legible */
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [confirmPasswordHidden, setConfirmPasswordHidden] = useState(true);

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
        setError(t('login.errors.googleToken'));
        return;
      }

      let res: Response;
      try {
        res = await appFetch('/auth/google', {
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
              ? t('login.errors.networkDev', { url: base })
              : t('login.errors.networkProd')
          );
        } else {
          setError(t('login.errors.server'));
        }
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (data?.code !== 'USER_BANNED') {
          setError(data.error || t('login.errors.loginFailed'));
        }
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
        setError(t('login.errors.inProgress'));
      } else {
        setError(t('login.errors.googleConnect'));
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

  useEffect(() => {
    setPasswordHidden(true);
    setConfirmPasswordHidden(true);
  }, [authMode]);

  async function registerWithUsername() {
    if (!pendingAuth || !username.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await appFetch('/auth/register', {
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
        if (data?.code !== 'USER_BANNED') {
          setError(data.error || t('login.errors.registerFailed'));
        }
      }
    } catch (err) {
      setError(t('login.errors.server'));
    } finally {
      setLoading(false);
    }
  }

  async function submitLocalAuth() {
    if (!email.trim() || !password.trim()) {
      setError(t('login.errors.emailPasswordRequired'));
      return;
    }
    if (authMode === 'local-register' && !localUsername.trim()) {
      setError(t('login.errors.usernameRequired'));
      return;
    }
    if (authMode === 'local-register' && password !== confirmPassword) {
      setError(t('login.errors.passwordsMismatch'));
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
      const res = await appFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code !== 'USER_BANNED') {
          setError(data.error || t('login.errors.localLoginFailed'));
        }
        return;
      }
      if (data.user) {
        setUser(data.user);
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(t('login.errors.server'));
    } finally {
      setLoading(false);
    }
  }

  if (step === 'username') {
    return (
      <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
        <View style={styles.card}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{t('login.chooseUsernameTitle')}</Text>
          <Text style={styles.subtitle}>{t('login.chooseUsernameSubtitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('common.username')}
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: brandAccent }]} onPress={registerWithUsername} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('common.continue')}</Text>}
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
        <Text style={styles.title}>{t('login.welcome')}</Text>

        <View style={styles.linksRow}>
          <TouchableOpacity style={styles.adminLink} onPress={() => router.push('/company-login' as Href)}>
            <Text style={styles.adminLinkText}>{t('login.companyAccess')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminLink} onPress={() => router.push('/admin-login')}>
            <Text style={styles.adminLinkText}>{t('login.adminAccess')}</Text>
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
                  <Text style={styles.googleButtonText}>{t('login.continueGoogle')}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.separatorText}>{t('common.or')}</Text>

            <TouchableOpacity
              style={[styles.primaryButton, styles.mailButton, { backgroundColor: brandAccent }]}
              onPress={() => {
                setAuthMode('local-login');
                setError('');
              }}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{t('login.mailPassword')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.googleButton, styles.skipGoogleButton]}
              onPress={continueWithoutGoogleTemporarily}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleButtonText}>{t('login.skipGoogle')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.localForm}>
            <Text style={styles.localTitle}>{t('login.registerTitle')}</Text>
            {authMode === 'local-register' ? (
              <TextInput
                style={styles.input}
                placeholder={t('common.username')}
                placeholderTextColor="#9ca3af"
                value={localUsername}
                onChangeText={setLocalUsername}
                autoCapitalize="none"
              />
            ) : null}
            <TextInput
              style={styles.input}
              placeholder={t('common.email')}
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('common.password')}
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={passwordHidden}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setPasswordHidden((h) => !h)}
                accessibilityRole="button"
                accessibilityLabel={passwordHidden ? t('login.a11y.showPassword') : t('login.a11y.hidePassword')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons
                  name={passwordHidden ? 'visibility' : 'visibility-off'}
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {authMode === 'local-register' ? (
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('common.confirmPassword')}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={confirmPasswordHidden}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setConfirmPasswordHidden((h) => !h)}
                  accessibilityRole="button"
                  accessibilityLabel={confirmPasswordHidden ? t('login.a11y.showConfirm') : t('login.a11y.hideConfirm')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <MaterialIcons
                    name={confirmPasswordHidden ? 'visibility' : 'visibility-off'}
                    size={22}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: brandAccent }]} onPress={submitLocalAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {authMode === 'local-register' ? t('login.createAccount') : t('login.signIn')}
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
                  ? t('login.switchToLogin')
                  : t('login.switchToRegister')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchModeButton, styles.switchModeButtonSecondary]}
              onPress={() => setAuthMode('google')}
              disabled={loading}
            >
              <Text style={styles.backGoogleText}>{t('login.backToGoogle')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.terms}>{t('login.terms')}</Text>
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginBottom: 12,
    paddingRight: 4,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
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