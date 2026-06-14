import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { GOOGLE_WEB_CLIENT_ID, getApiUrl } from '@/constants/api';
import { savePrivilegedSession, type PrivilegedRole } from '@/services/privilegedAuth';

const IS_WEB = Platform.OS === 'web';

export type PrivilegedLoginI18nNs = 'adminLogin' | 'companyLogin';

export type PrivilegedLoginConfig = {
  role: PrivilegedRole;
  i18nNs: PrivilegedLoginI18nNs;
  userResponseKey: 'admin' | 'company';
  localLoginPath: string;
  googleLoginPath: string;
  homePath: Href;
  backPath: Href;
};

type SessionUser = { email: string };

export function usePrivilegedLogin(config: PrivilegedLoginConfig) {
  const { t } = useTranslation();
  const router = useRouter();
  const { openGoogle } = useLocalSearchParams<{ openGoogle?: string }>();
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
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

  const labels = useMemo(
    () => ({
      title: t(`${config.i18nNs}.title`),
      subtitle: t(`${config.i18nNs}.subtitle`),
      googleHint: t(`${config.i18nNs}.googleHint`),
      sessionStarted: t(`${config.i18nNs}.sessionStarted`),
      goToApp: t(`${config.i18nNs}.goToApp`),
      openingGoogle: t(`${config.i18nNs}.openingGoogle`),
      backToLogin: t(`${config.i18nNs}.backToLogin`),
      loginFailed: t(`${config.i18nNs}.loginFailed`),
      serverHint: t(`${config.i18nNs}.serverHint`),
    }),
    [t, config.i18nNs]
  );

  useEffect(() => {
    if (!IS_WEB) return;
    if (response?.type !== 'success' || !request) return;
    const code = response.params.code;
    const verifier = (request as { codeVerifier?: string }).codeVerifier;
    if (!code) return;
    loginWithCode(code, redirectUri, verifier);
  }, [response]);

  useEffect(() => {
    if (!IS_WEB) return;
    if (openGoogle === '1' && request && !openedGoogleRef.current) {
      openedGoogleRef.current = true;
      promptAsync();
    }
  }, [openGoogle, request]);

  async function persistAndNavigate(user: unknown, token: string) {
    await savePrivilegedSession(config.role, { token, user });
    router.replace(config.homePath);
  }

  async function submitLocalLogin() {
    if (!email.trim() || !password) {
      setError(t('login.errors.emailPasswordRequired'));
      return;
    }
    setLocalLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}${config.localLoginPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = [data.error, data.message].filter(Boolean).join(' — ');
        setError(detail || t('login.errors.localLoginFailed'));
        return;
      }
      const profile = data[config.userResponseKey];
      if (profile && data.token) {
        setSessionUser(profile);
        await persistAndNavigate(profile, data.token);
      }
    } catch {
      setError(labels.serverHint);
    } finally {
      setLocalLoading(false);
    }
  }

  async function loginWithIdToken(idToken: string) {
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}${config.googleLoginPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || labels.loginFailed);
        return;
      }
      const profile = data[config.userResponseKey];
      if (profile && data.token) {
        setSessionUser(profile);
        await persistAndNavigate(profile, data.token);
      }
    } catch {
      setError(labels.serverHint);
    }
  }

  async function loginWithCode(code: string, redirectUriValue: string, codeVerifier?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}${config.googleLoginPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: redirectUriValue, code_verifier: codeVerifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || labels.loginFailed);
        return;
      }
      const profile = data[config.userResponseKey];
      if (profile && data.token) {
        setSessionUser(profile);
        await persistAndNavigate(profile, data.token);
      }
    } catch {
      setError(labels.serverHint);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (IS_WEB) {
      promptAsync();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const legacy = userInfo as { idToken?: string };
      const modern = userInfo as { data?: { idToken?: string } };
      const idToken = legacy.idToken ?? modern.data?.idToken;
      if (!idToken) {
        setError(t('login.errors.googleToken'));
        return;
      }
      await loginWithIdToken(idToken);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;
      if (code === statusCodes.IN_PROGRESS) setError(t('login.errors.inProgress'));
      else setError(t('login.errors.googleConnect'));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    router.replace(config.backPath);
  }

  function goToTabs() {
    router.replace('/(tabs)' as Href);
  }

  return {
    labels,
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    localLoading,
    sessionUser,
    request,
    showGoogleHint: !GOOGLE_WEB_CLIENT_ID,
    showOpeningGoogle: openGoogle === '1' && IS_WEB,
    googleDisabled: !GOOGLE_WEB_CLIENT_ID || (IS_WEB && !request) || loading || localLoading,
    submitLocalLogin,
    handleGoogleLogin,
    goBack,
    goToTabs,
  };
}
