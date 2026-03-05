import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={styles.title}>
          Bienvenido a e-Go
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Tu app per gestionar incidències i millorar la mobilitat de forma sostenible.
        </ThemedText>
        <ThemedText style={styles.helper}>
          Fes servir la pestanya d&apos;exploració per descobrir les funcionalitats que
          anirem afegint.
        </ThemedText>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: Colors.light.tint }]}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.loginButtonText}>Iniciar sesión con Google</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  helper: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
  },
  loginButton: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 260,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
