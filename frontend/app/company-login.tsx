// Login empresa: email/contraseña o Google; JWT para portal empresa
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { PrivilegedLoginView } from '@/components/auth/PrivilegedLoginView';
import { GOOGLE_WEB_CLIENT_ID } from '@/constants/api';

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

const COMPANY_LOGIN_CONFIG = {
  role: 'company' as const,
  i18nNs: 'companyLogin' as const,
  userResponseKey: 'company' as const,
  localLoginPath: '/auth/company/local/login',
  googleLoginPath: '/auth/company/google',
  homePath: '/company-home' as const,
  backPath: '/login' as const,
};

export default function CompanyLoginScreen() {
  return <PrivilegedLoginView config={COMPANY_LOGIN_CONFIG} />;
}
