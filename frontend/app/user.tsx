import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Alert, Image, View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { appFetch } from '@/services/appFetch';
import { getApiUrl } from '@/constants/api';
import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const LOGO = require('./_assets/favicon.png'); // Ruta a tu imagen de perfil (el logo de momento)
const RAINBOW_BASE_COLORS = ['#3b82f6', '#a855f7', '#ec4899', '#f97316', '#facc15', '#3fad17', '#14b8b0', '#3b82f6'];
const GRADIENT_STEPS = 48;

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
  const [esAmic, setEsAmic] = useState(0);
  const [isAcceptingFriend, setIsAcceptingFriend] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isRejectingRequest, setIsRejectingRequest] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [rainbowShift, setRainbowShift] = useState(0);
  const [amicsList, setAmicsList] = useState<any[]>([]);
  const [loadingFriendRequests, setLoadingFriendRequests] = useState<{ [key: number]: boolean }>({});
  const queryParams = useLocalSearchParams();
  const userIdParam = queryParams.userId || queryParams.usuari_id;
  const parsedUserId = Number(userIdParam);
  const idUser = Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : user?.id ?? 1;

  const router = useRouter();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createUserStyles(sem), [sem]);

  // Referència a la part de la pantalla que volem "fotografiar"
  const viewShotRef = useRef<ViewShot>(null);

  // Funció que fa la captura i la comparteix
  const shareToInstagram = async () => {
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        // Fa la captura i ens retorna la ruta de la imatge
        const uri = await viewShotRef.current.capture();

        // Comprovem si el mòbil permet compartir arxius
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Comparte tu perfil de e-Go',
            UTI: 'public.jpeg', // Especial per a iOS
          });
        } else {
          Alert.alert('Error', 'El uso compartido no está disponible en este dispositivo');
        }
      }
    } catch (error) {
      console.error('Error al compartir:', error);
      Alert.alert('Error', 'No se ha podido capturar el perfil.');
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRainbowShift((shift) => (shift + 1) % RAINBOW_COLORS.length);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPerfil();
    fetchAmics();
  }, [idUser]);

  const fetchPerfil = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const response = await appFetch(`/user?usuari_id=${idUser}`); // dades de l'usuari
      const data = await response.json();
      setPerfil(data);
      setEditedUsername(data.username ?? '');
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAmics = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${getApiUrl()}/friends?usuari_id=${idUser}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAmicsList(data);
        console.log("AmicsList:", data);
        const friendRelation = data.find((friend: any) => Number(friend?.id) === user.id);
        if (friendRelation) {
          // Es amigo: 3 si aceptado, 2 si pendiente de aceptación por el usuario en pantalla, 1 si pendiente de aceptación por el usuario logueado
          if(friendRelation.per_acceptar === null) setEsAmic(3);
          else setEsAmic(friendRelation.per_acceptar === user.id ? 1 : 2);    
        } else {
          // No es amigo
          setEsAmic(0);
        }
      } else {
        setAmicsList([]);
        setEsAmic(0);
      }
    } catch (error) {
      console.error("Error cargando amigos:", error);
      setAmicsList([]);
      setEsAmic(0);
    }
  };

  const sendFriendRequest = async () => {
    if (!user?.id || !idUser) return;
    setIsSendingRequest(true);
    try {
      const response = await fetch(`${getApiUrl()}/friends?usuari_id1=${user.id}&usuari_id2=${idUser}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Error enviando solicitud');
      }
      setEsAmic(2);
    } catch (error) {
      console.error('Error enviando solicitud:', error);
    } finally {
      setIsSendingRequest(false);
    }
  };

  const removeFriendAction = async () => {
    if (!user?.id || !idUser) return;
    setIsRemovingFriend(true);
    try {
      const response = await fetch(`${getApiUrl()}/friends?usuari_id1=${user.id}&usuari_id2=${idUser}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Error eliminando amigo');
      }
      setEsAmic(0);
    } catch (error) {
      console.error('Error eliminando amigo:', error);
    } finally {
      setIsRemovingFriend(false);
    }
  };

  const handleAcceptFriendRequest = async (friendId: number) => {
    if (!user?.id) return;
    setLoadingFriendRequests((prev) => ({ ...prev, [friendId]: true }));
    try {
      const response = await fetch(`${getApiUrl()}/friends?usuari_id1=${user.id}&usuari_id2=${friendId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Error aceptando solicitud');
      }
      // Actualizar llista d'amics
      fetchAmics();
    } catch (error) {
      console.error('Error aceptando solicitud:', error);
    } finally {
      setLoadingFriendRequests((prev) => ({ ...prev, [friendId]: false }));
    }
  };

  const handleRejectFriendRequest = async (friendId: number) => {
    if (!user?.id) return;
    setLoadingFriendRequests((prev) => ({ ...prev, [friendId]: true }));
    try {
      const response = await fetch(`${getApiUrl()}/friends?usuari_id1=${user.id}&usuari_id2=${friendId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Error rechazando solicitud');
      }
      // Actualizar llista d'amics
      fetchAmics();
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
    } finally {
      setLoadingFriendRequests((prev) => ({ ...prev, [friendId]: false }));
    }
  };

  const handleCancelFriendRequest = async (friendId: number) => {
    if (!user?.id) return;
    setLoadingFriendRequests((prev) => ({ ...prev, [friendId]: true }));
    try {
      const response = await fetch(`${getApiUrl()}/friends?usuari_id1=${user.id}&usuari_id2=${friendId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Error cancelando solicitud');
      }
      // Actualizar llista d'amics
      fetchAmics();
    } catch (error) {
      console.error('Error cancelando solicitud:', error);
    } finally {
      setLoadingFriendRequests((prev) => ({ ...prev, [friendId]: false }));
    }
  };

  const savePerfil = async () => {
    if (!perfil || perfil.id !== user?.id) return;
    setIsSaving(true);
    try {
      const response = await appFetch(`/user?usuari_id=${idUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editedUsername}),
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

  const renderFriendRequests = () => {
    const receivedRequests = amicsList.filter((friend) => friend.per_acceptar === user?.id);
    const sentRequests = amicsList.filter((friend) => friend.per_acceptar !== null && friend.per_acceptar !== user?.id);

    return (
      <>
        {receivedRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsTitle}>Solicitudes recibidas ({receivedRequests.length})</Text>
            <View style={styles.requestsList}>
              {receivedRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <Text style={styles.requestUsername}>{request.username || `Usuario ${request.id}`}</Text>
                  <View style={styles.requestButtonGroup}>
                    <TouchableOpacity
                      style={[styles.requestAcceptButton, loadingFriendRequests[request.id] && styles.buttonDisabled]}
                      onPress={() => handleAcceptFriendRequest(request.id)}
                      disabled={loadingFriendRequests[request.id]}
                    >
                      <MaterialIcons name="check" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestRejectButton, loadingFriendRequests[request.id] && styles.buttonDisabled]}
                      onPress={() => handleRejectFriendRequest(request.id)}
                      disabled={loadingFriendRequests[request.id]}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {sentRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsTitle}>Solicitudes enviadas ({sentRequests.length})</Text>
            <View style={styles.requestsList}>
              {sentRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <Text style={styles.requestUsername}>{request.username || `Usuario ${request.id}`}</Text>
                  <TouchableOpacity
                    style={[styles.requestCancelButton, loadingFriendRequests[request.id] && styles.buttonDisabled]}
                    onPress={() => handleCancelFriendRequest(request.id)}
                    disabled={loadingFriendRequests[request.id]}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </>
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
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 0.9 }}
          style={{ backgroundColor: '#fff', borderRadius: 16 }} // Posa el color de fons del teu perfil
        >
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarWrapper}>
              <Image source={LOGO} style={styles.avatar} resizeMode="contain" />
            </View>
            <View style={styles.profileContent}>
              {renderProfileName()}
              {perfil?.id === user?.id && (
                <>
                  <Text style={styles.profileEmail}>{perfil?.email ?? 'email@ejemplo.com'}</Text>
                  {!isEditing ? (
                    <>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditedUsername(perfil?.username ?? '');
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
                    </>
                  )}
                </>
              ) : (
              <>
                {esAmic === 0 && (
                  <TouchableOpacity
                    style={[styles.primaryButton, isSendingRequest && styles.buttonDisabled]}
                    onPress={sendFriendRequest}
                    disabled={isSendingRequest}
                  >
                    <MaterialIcons name="person-add" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>{isSendingRequest ? 'Enviando...' : 'Enviar solicitud'}</Text>
                  </TouchableOpacity>
                )}
                {esAmic === 1 && (
                  <View style={styles.pendingRequestContainer}>
                    <View>
                      <Text style={styles.pendingRequestText}>Solicitud pendiente</Text>
                      <Text style={styles.pendingRequestSubtext}>Tienes una solicitud de amistad de este usuario</Text>
                    </View>
                    <View style={styles.buttonGroup}>
                      <TouchableOpacity
                        style={[styles.acceptButton, isAcceptingFriend && styles.buttonDisabled]}
                        onPress={() => handleAcceptFriendRequest(idUser)}
                        disabled={isAcceptingFriend || isRejectingRequest}
                      >
                        <MaterialIcons name="check" size={18} color="#fff" />
                        <Text style={styles.acceptButtonText}>{isAcceptingFriend ? 'Aceptando...' : 'Aceptar'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rejectButton, isRejectingRequest && styles.buttonDisabled]}
                        onPress={() => handleRejectFriendRequest(idUser)}
                        disabled={isRejectingRequest || isAcceptingFriend}
                      >
                        <MaterialIcons name="close" size={18} color="#fff" />
                        <Text style={styles.rejectButtonText}>{isRejectingRequest ? 'Rechazando...' : 'Rechazar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {esAmic === 2 && (
                  <View style={styles.sentRequestContainer}>
                    <View style={styles.sentRequestContent}>
                      <MaterialIcons name="mail-outline" size={16} color="#f59e0b" />
                      <Text style={styles.sentRequestText}>Solicitud enviada</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.cancelFriendButton, isSendingRequest && styles.buttonDisabled]}
                      onPress={() => handleCancelFriendRequest(idUser)}
                      disabled={isSendingRequest}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {esAmic === 3 && (
                  <View style={styles.friendStatusContainer}>
                    <View style={styles.friendStatusContent}>
                      <MaterialIcons name="check-circle" size={16} color="#10b981" />
                      <Text style={styles.friendStatusText}>✓ Amigo</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.deleteButton, isRemovingFriend && styles.buttonDisabled]}
                      onPress={removeFriendAction}
                      disabled={isRemovingFriend}
                    >
                      <MaterialIcons name="person-remove" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
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
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
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
          </ViewShot>
          {perfil?.id === user?.id && renderFriendRequests()}
          ) : (
            <Text style={styles.emptyText}>No existe el usuario</Text>
          </ViewShot>
          )}


        {/* AFEGIM EL BOTÓ D'INSTAGRAM */}
        <TouchableOpacity
          style={styles.instagramButton}
          onPress={shareToInstagram}
          activeOpacity={0.8}
        >
          <MaterialIcons name="camera-alt" size={20} color="#fff" />
          <Text style={styles.instagramButtonText}>Comparte tu perfil!</Text>
        </TouchableOpacity>
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
  friendStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  friendStatusText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 6,
  },
  pendingRequestContainer: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    gap: 10,
  },
  pendingRequestText: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '600',
  },
  pendingRequestSubtext: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  acceptButtonDisabled: {
    backgroundColor: '#6ee7b7',
    opacity: 0.7,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  sentRequestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  sentRequestText: {
    fontSize: 14,
    color: '#b45309',
    fontWeight: '600',
    marginLeft: 6,
  },
  sentRequestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelFriendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  requestsSection: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  requestsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  requestsList: {
    gap: 10,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  requestUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  requestDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  requestButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  requestAcceptButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  requestRejectButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  requestCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sem.accent,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20, // Ajusta l'espai com necessitis
    gap: 8,
  },
  instagramButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});