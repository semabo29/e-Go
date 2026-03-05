import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  const handleGooglePress = () => {
    // Solo frontend: aquí iría la lógica de OAuth más adelante
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Iniciar sesión
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Accede o crea un compte per utilitzar e-Go
      </ThemedText>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGooglePress}
        activeOpacity={0.8}
      >
        <ThemedText style={styles.googleButtonText}>
          Iniciar sesión con Google
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  title: {
    textAlign: 'center',

  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.9,
  },
  googleButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 260,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c4043',
  },
});
