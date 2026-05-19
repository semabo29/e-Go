/** Helpers para ramas testables (EXPO_OS en runtime). */
export function shouldUseNativeInAppBrowser(): boolean {
  return process.env.EXPO_OS !== 'web';
}

export function shouldUseIosTabHaptic(): boolean {
  return process.env.EXPO_OS === 'ios';
}
