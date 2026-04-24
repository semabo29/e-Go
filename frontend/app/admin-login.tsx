// Login admin con Google; devuelve JWT para backoffice
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
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
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

import { getApiUrl, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import { Colors } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const BRAND_GREEN = Colors.light.tint;
const LOGO = require('./_assets/favicon.png');
const ADMIN_TOKEN_KEY = '@ego_admin_token';
const ADMIN_USER_KEY = '@ego_admin_user';
const IS_WEB = Platform.OS === 'web';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

type AdminUser = {
  id: number;
  email: string;
  username: string;
  admin_since?: string;
};

export default function AdminLoginScreen() {
  const router = useRouter();
  const { openGoogle } = useLocalSearchParams<{ openGoogle?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const openedGoogleRef = useRef(false);

  const discovery = useAutoDiscovery('https://accounts.google.com');
  const redirectUri = makeRedirectUri({ scheme: 'frontend' });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
    },
    discovery ?? null
  );

  useEffect(() => {
    if (!IS_WEB) return;
    if (response?.type !== 'success' || !request) return;
    const { code } = response.params;
    const verifier = (request as { codeVerifier?: string }).codeVerifier;
    if (!code) return;
    loginAdminWithCode(code, redirectUri, verifier);
  }, [response]);

  useEffect(() => {
    if (!IS_WEB) return;
    if (openGoogle === '1' && request && !openedGoogleRef.current) {
      openedGoogleRef.current = true;
      promptAsync();
    }
  }, [openGoogle, request]);

  async function loginAdminWithIdToken(idToken: string) {
    try {
      const res = await fetch(`${getApiUrl()}/auth/admin/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesion admin');
        return;
      }

      if (data.admin && data.token) {
        setAdmin(data.admin);
        await AsyncStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        await AsyncStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
        router.replace('/admin-home');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Comprueba la URL del backend.');
    }
  }

  async function loginAdminWithCode(code: string, redirectUri: string, codeVerifier?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/auth/admin/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri, code_verifier: codeVerifier }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesion admin');
        return;
      }

      if (data.admin && data.token) {
        setAdmin(data.admin);
        await AsyncStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        await AsyncStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
        router.replace('/admin-home');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Comprueba la URL del backend.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin() {
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

      await loginAdminWithIdToken(idToken);
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // Cancelado por el usuario
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Ya hay un inicio de sesion en curso');
      } else {
        setError('Error al conectar con Google');
        console.error('[Google Native Error]', err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Acceso Admin</Text>
        <Text style={styles.subtitle}>Backoffice de e-Go</Text>

        {!GOOGLE_WEB_CLIENT_ID ? (
          <Text style={styles.errorText}>
            Configura EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en el .env del frontend
          </Text>
        ) : admin ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Sesion iniciada</Text>
            <Text style={styles.successText}>{admin.email}</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/(tabs)')}
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
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleAdminLogin}
              disabled={(IS_WEB && !request) || loading}
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

        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/login')}>
          <Text style={styles.backLinkText}>Volver al login</Text>
        </TouchableOpacity>
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
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
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
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
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
  successBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  successText: {
    fontSize: 14,
    color: '#374151',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 20,
  },
  backLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
