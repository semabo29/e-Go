// Layout raíz: tema, tabs (Home, Explorar) y pantalla de login
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';

// expo-keep-awake (usado por herramientas de desarrollo) puede rechazar la promesa si la
// pantalla estuvo apagada o el activity no estaba listo; no afecta a producción.
if (__DEV__) {
  LogBox.ignoreLogs([/keep awake/i]);
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="admin-login" options={{ headerShown: false }} />
          <Stack.Screen name="admin-home" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
