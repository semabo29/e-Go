import React, { useState, useEffect, useMemo } from 'react';
import { Image, View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getApiUrl } from '@/constants/api';
import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

import { useRouter, Stack, useLocalSearchParams } from 'expo-router';

const LOGO = require('./_assets/favicon.png'); // Ruta a tu imagen de perfil (el logo de momento)
const RAINBOW_BASE_COLORS = ['#3b82f6', '#a855f7', '#ec4899', '#f97316', '#facc15', '#3fad17', '#14b8b0', '#3b82f6'];
const GRADIENT_STEPS = 48; //

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
    .toString(16)
    .slice(1)}`;

const interpolateColor = (start: string, end: string, t: number) => {
  const c1 = hexToRgb(start);
  const c2 = hexToRgb(end);
  return rgbToHex({
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  });
};

const generateGradientColors = (baseColors: string[], steps: number) => {
  const gradient: string[] = [];
  const segmentCount = baseColors.length - 1;
  for (let i = 0; i < steps; i += 1) {
    const position = (i / (steps - 1)) * segmentCount;
    const index = Math.floor(position);
    const t = position - index;
    const start = baseColors[index];
    const end = baseColors[index + 1] ?? baseColors[baseColors.length - 1];
    gradient.push(interpolateColor(start, end, t));
  }
  return gradient;
};

const RAINBOW_COLORS = generateGradientColors(RAINBOW_BASE_COLORS, GRADIENT_STEPS);

interface PerfilUser {
  id: number;
  username: string;
  email: string;
  punts: number;
  created_at: string;
  premium: boolean;
  admin: boolean;
  empresa: boolean;
}

export default function PerfilScreen() {
  const { user, setUser } = useAuth();

  const [perfil, setPerfil] = useState<PerfilUser>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [rainbowShift, setRainbowShift] = useState(0);
  const queryParams = useLocalSearchParams();
  const userIdParam = queryParams.userId || queryParams.usuari_id;
  const parsedUserId = Number(userIdParam);
  const idUser = Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : user?.id ?? 1;

  const router = useRouter();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createUserStyles(sem), [sem]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRainbowShift((shift) => (shift + 1) % RAINBOW_COLORS.length);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPerfil();
  }, [idUser]);

  const fetchPerfil = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/user?usuari_id=${idUser}`); // dades de l'usuari
      const data = await response.json();
      setPerfil(data);
      setEditedUsername(data.username ?? '');
      setEditedEmail(data.email ?? '');
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePerfil = async () => {
    if (!perfil || perfil.id !== user?.id) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${getApiUrl()}/user?usuari_id=${idUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editedUsername, email: editedEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error saving profile');
      }
      setPerfil({ ...perfil, username: data.username, email: data.email });
      setUser({ ...user, username: data.username, email: data.email });
      setIsEditing(false);
    } catch (error) {
      console.error('Error guardando perfil:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfileName = () => {
    const name = perfil?.username ?? 'Usuario';
    if (!perfil?.premium) {
      return <Text style={styles.profileName}>{name}</Text>;
    }

    return (
      <Text style={styles.profileName}>
        {name.split('').map((char, index) => {
          const colorIndex = (index + rainbowShift) % RAINBOW_COLORS.length;
          return (
            <Text key={`${char}-${index}`} style={{ color: RAINBOW_COLORS[colorIndex] }}>
              {char}
            </Text>
          );
        })}
        {' '}👑
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Capçalera */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Perfil</Text>
        {/* Espai buit per centrar el títol */}
        <View style={{ width: 24 }} />
      </View>
      {/* Contingut del perfil */}
      <View style={styles.profileContainer}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatarWrapper}>
            <Image source={LOGO} style={styles.avatar} resizeMode="contain" />
          </View>
          <View style={styles.profileContent}>
            {renderProfileName()}
            {perfil?.id === user?.id && (
              <>
                {!isEditing ? (
                  <>
                    <Text style={styles.profileEmail}>{perfil?.email ?? 'email@ejemplo.com'}</Text>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setEditedUsername(perfil?.username ?? '');
                        setEditedEmail(perfil?.email ?? '');
                        setIsEditing(true);
                      }}
                    >
                      <Text style={styles.editButtonText}>Modificar perfil</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      value={editedUsername}
                      onChangeText={setEditedUsername}
                      placeholder="Nombre de usuario"
                      placeholderTextColor="#94a3b8"
                    />
                    <TextInput
                      style={styles.input}
                      value={editedEmail}
                      onChangeText={setEditedEmail}
                      placeholder="Email"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </>
                )}
              </>
            )}
            <Text style={styles.profileSubtitle}>Se unió el {perfil?.created_at ? new Date(perfil.created_at).toLocaleDateString() : 'fecha no disponible'}</Text>
            {(perfil?.empresa || perfil?.admin) && (
              <View style={styles.badgeRow}>
                {perfil?.empresa && (
                  <View style={styles.badge}>
                    <MaterialIcons name="business" size={16} color="#2563eb" />
                    <Text style={styles.badgeLabel}>Empresa</Text>
                  </View>
                )}
                {perfil?.admin && (
                  <View style={styles.badge}>
                    <MaterialIcons name="shield" size={16} color={sem.mapCustomLocation} />
                    <Text style={styles.badgeLabel}>Admin</Text>
                  </View>
                )}
              </View>
            )}
            {perfil?.id === user?.id && isEditing && (
              <>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={savePerfil}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditedUsername(perfil?.username ?? '');
                    setEditedEmail(perfil?.email ?? '');
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={sem.accent} />
            <Text style={styles.loadingText}>Cargando perfil...</Text>
          </View>
        ) : perfil ? (
          <View style={[styles.statsCard, styles.centered]}>
            <Text style={styles.points}>{perfil.punts}</Text>
            <Text style={styles.ptsLabel}>Puntos</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No existe el usuario</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const createUserStyles = (sem: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  profileContainer: {
    padding: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  profileAvatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
  },
  profileContent: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileEmail: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  profileSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    color: '#111827',
  },
  editButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: sem.accent,
    alignItems: 'center',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  saveButtonDisabled: {
    backgroundColor: sem.chipActiveBg,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 18,
    padding: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  backButton: {
    padding: 4,
  },
  points: {
    fontSize: 20,
    fontWeight: '800',
    color: sem.accent,
  },
  ptsLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
    fontSize: 16,
  },
});