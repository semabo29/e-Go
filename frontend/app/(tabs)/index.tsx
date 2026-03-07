// Inicio (primera pestaña). Sin sesión: bienvenida + Google. Con sesión: menú 3 barras + PANTALLA PRINCIPAL.
// Para cambiar el contenido principal: busca "PANTALLA PRINCIPAL" en este archivo y edita ese bloque.
import { useState } from 'react';
import { MapView, Marker } from '../components/MapWrapper';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAuth } from '@/contexts/AuthContext';

const LOGO = require('../_assets/favicon.png');

export default function InicioScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.loadingText}>Cargando…</Text>
      </View>
    );
  }

  if (!user) {
    // Sin login: bienvenida y botón Google
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Bienvenido a e-Go</Text>
            <Text style={styles.subtitle}>
              Tu navegador de estaciones de carga en Catalunya
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push({ pathname: '/login', params: { openGoogle: '1' } })}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.loginButtonText}>Continuar con Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Con sesión: botón menú (3 barras) + contenido principal
  return (
    <View style={styles.screen}>
      {/* Botón menú (tres barras) flotante arriba a la izq */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMenuOpen(true)}
        activeOpacity={0.8}
      >
        <View style={styles.menuBar} />
        <View style={styles.menuBar} />
        <View style={styles.menuBar} />
      </TouchableOpacity>

      <View style={styles.mainContent}>
        <MapView
          style={{ width: '100%', height: '100%' }}
          initialRegion={{
            latitude: 41.3879,      // Barcelona
            longitude: 2.16992,
            latitudeDelta: 0.05,    // Zoom aproximado
            longitudeDelta: 0.05,
          }}
        >
          {/* Marcador de ejemplo en Barcelona */}
          <Marker
            coordinate={{ latitude: 41.3879, longitude: 2.16992 }}
            title="Barcelona"
            description="Centro de la ciudad"
          />
        </MapView>
      </View>

      {/* Menú desplegable (ajustes / cerrar sesión) */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuDrawer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Ajustes</Text>
              <TouchableOpacity
                onPress={() => setMenuOpen(false)}
                style={styles.menuClose}
                hitSlop={12}
              >
                <MaterialIcons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                logout();
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="logout" size={22} color="#1f2937" />
              <Text style={styles.menuItemText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  // Pantalla sin login (card bienvenida)
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  // Botón menú (tres barras) sin header
  menuButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 10,
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  menuBar: {
    width: 22,
    height: 2.5,
    backgroundColor: '#1f2937',
    borderRadius: 2,
  },
  // Contenido principal
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mainLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 1,
  },
  // Menú lateral (ajustes / cerrar sesión)
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuDrawer: {
    width: '75%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  menuClose: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
});
