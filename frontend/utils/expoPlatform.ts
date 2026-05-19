import { Platform } from 'react-native';

/** Abre enlaces en navegador in-app en nativo (no en web). */
export function shouldUseNativeInAppBrowser(): boolean {
  return Platform.OS !== 'web';
}

/** Haptic suave en pestañas solo en iOS. */
export function shouldUseIosTabHaptic(): boolean {
  return Platform.OS === 'ios';
}
