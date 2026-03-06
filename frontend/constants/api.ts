// URL del backend. En móvil/emulador puede que tengáis que poner la IP del PC (ej: http://192.168.1.34:3000). En emulador Android: http://10.0.2.2:3000
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Mismo Client ID de Google (tipo Web) que en el backend
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
