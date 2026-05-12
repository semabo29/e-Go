import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

const ENV_API = process.env.EXPO_PUBLIC_API_URL?.trim() || '';

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/** Host desde la URL del bundle de Metro: es la misma IP/host que el móvil ya usa para hablar con el PC. */
function hostFromScriptUrl(): string | null {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
    if (!scriptURL?.trim()) return null;
    const t = scriptURL.trim();
    if (!t.startsWith('http://') && !t.startsWith('https://')) return null;
    const hostname = new URL(t).hostname;
    return hostname || null;
  } catch {
    return null;
  }
}

function hostFromDevConnection(): string | null {
  try {
    const expoConfig = Constants.expoConfig as { hostUri?: string } | undefined;
    const fromConfig = expoConfig?.hostUri;
    if (fromConfig) {
      const host = fromConfig.split(':')[0]?.trim();
      if (host) return host;
    }

    const go = Constants.expoGoConfig as { debuggerHost?: string } | undefined;
    const fromGo = go?.debuggerHost;
    if (fromGo) {
      const host = fromGo.split(':')[0]?.trim();
      if (host) return host;
    }

    const m2 = Constants.manifest2 as {
      extra?: { expoClient?: { hostUri?: string } };
    } | null;
    const clientUri = m2?.extra?.expoClient?.hostUri;
    if (clientUri) {
      const host = clientUri.split(':')[0]?.trim();
      if (host) return host;
    }
  } catch {
    // bridge o manifest no listos
  }
  return null;
}

function isProbablyAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  const c = Platform.constants as {
    Brand?: string;
    Manufacturer?: string;
    Model?: string;
    Fingerprint?: string;
  };
  const m = `${c?.Fingerprint ?? ''}${c?.Manufacturer ?? ''}${c?.Model ?? ''}${c?.Brand ?? ''}`.toLowerCase();
  return (
    m.includes('generic') ||
    m.includes('unknown') ||
    m.includes('google_sdk') ||
    m.includes('emulator') ||
    m.includes('ranchu') ||
    m.includes('gphone') ||
    m.includes('sdk_gphone')
  );
}

/**
 * En dev en dispositivo, deduce el host del PC donde corre el backend (puerto 3000).
 * Prioridad: URL del bundle Metro → hostUri de Expo → emulador Android → loopback (simu iOS / adb reverse).
 */
function resolveDevMobileHost(): string | null {
  const fromScript = hostFromScriptUrl();
  // Metro por USB (--localhost): el bundle viene de 127.0.0.1; la API debe usar el mismo loopback
  // para que adb reverse tcp:3000 llegue al PC. Si priorizáramos hostUri LAN de Expo, fallaría.
  if (fromScript && isLoopbackHost(fromScript)) {
    return fromScript;
  }
  if (fromScript && !isLoopbackHost(fromScript)) {
    return fromScript;
  }

  const fromExpo = hostFromDevConnection();
  if (fromExpo && !isLoopbackHost(fromExpo)) {
    return fromExpo;
  }

  if (Platform.OS === 'android' && isProbablyAndroidEmulator()) {
    return '10.0.2.2';
  }

  if (Platform.OS === 'ios') {
    return 'localhost';
  }

  return fromExpo;
}

function defaultApiPort(): string {
  return process.env.EXPO_PUBLIC_API_PORT?.trim() || '3000';
}

function isUsbDevModeEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DEV_USE_USB === '1';
}

function computeApiBase(): string {
  const apiPort = defaultApiPort();

  // npm run start:usb: expo-start define EXPO_PUBLIC_DEV_USE_USB=1 para Metro → URL fija por adb reverse.
  if (__DEV__ && Platform.OS !== 'web' && isUsbDevModeEnabled()) {
    return `http://127.0.0.1:${apiPort}`;
  }

  if (!__DEV__ || Platform.OS === 'web') {
    return ENV_API || `http://localhost:${apiPort}`;
  }

  const useAuto = !ENV_API || isLocalhostUrl(ENV_API);
  if (!useAuto) {
    return ENV_API;
  }

  const host = resolveDevMobileHost();
  if (host) {
    // Solo usamos loopback en móvil cuando el desarrollador ha arrancado en modo USB
    // (npm run start:usb + adb reverse). En otros casos priorizamos host de red.
    if (isLoopbackHost(host) && !isUsbDevModeEnabled()) {
      const fromExpo = hostFromDevConnection();
      if (fromExpo && !isLoopbackHost(fromExpo)) {
        return `http://${fromExpo}:${apiPort}`;
      }
      if (Platform.OS === 'android') {
        return `http://10.0.2.2:${apiPort}`;
      }
    }
    return `http://${host}:${apiPort}`;
  }

  return ENV_API || `http://localhost:${apiPort}`;
}

let memo: string | undefined;

/**
 * URL base del backend; se resuelve en la primera llamada (evita leer Constants demasiado pronto al importar).
 */
export function getApiUrl(): string {
  if (memo !== undefined) return memo;
  let base: string;
  try {
    base = computeApiBase();
  } catch {
    base = ENV_API || `http://localhost:${defaultApiPort()}`;
  }
  // Evita `//auth/...` si EXPO_PUBLIC_API_URL termina en `/` (algunos proxies devuelven 404).
  memo = (base || `http://localhost:${defaultApiPort()}`).replace(/\/+$/, '');
  return memo;
}
