// Login admin con Google; devuelve JWT para backoffice
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { PrivilegedLoginView } from '@/components/auth/PrivilegedLoginView';
import { GOOGLE_WEB_CLIENT_ID } from '@/constants/api';

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

const ADMIN_LOGIN_CONFIG = {
  role: 'admin' as const,
  i18nNs: 'adminLogin' as const,
  userResponseKey: 'admin' as const,
  localLoginPath: '/auth/admin/local/login',
  googleLoginPath: '/auth/admin/google',
  homePath: '/admin-home' as const,
  backPath: '/' as const,
};

export default function AdminLoginScreen() {
  return <PrivilegedLoginView config={ADMIN_LOGIN_CONFIG} />;
}
