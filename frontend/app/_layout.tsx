// Layout raíz: tema, tabs (Home, Explorar) y pantalla de login
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { ChargingProvider } from '@/contexts/ChargingContext';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ColorblindPreferenceProvider } from '@/contexts/ColorblindPreferenceContext';
import { ThemePreferenceProvider } from '@/contexts/ThemePreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
    // Afegim style={{ flex: 1 }} al GestureHandler perquè ocupi tota la pantalla correctament
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemePreferenceProvider>
          <ColorblindPreferenceProvider>
            <RootLayoutContent />
          </ColorblindPreferenceProvider>
        </ThemePreferenceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <AuthProvider>
      <ChargingProvider>
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="my-favorite-stations" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="admin-login" options={{ headerShown: false }} />
            <Stack.Screen name="company-login" options={{ headerShown: false }} />
            <Stack.Screen name="admin-home" options={{ headerShown: false }} />
            <Stack.Screen name="company-home" options={{ headerShown: false }} />
            <Stack.Screen name="company-requests" options={{ headerShown: false }} />
            <Stack.Screen name="admin-requests" options={{ headerShown: false }} />
            <Stack.Screen name="admin-station-new" options={{ headerShown: false }} />
            <Stack.Screen name="company-station-new" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </ThemeProvider>
      </ChargingProvider>
    </AuthProvider>
  );
}