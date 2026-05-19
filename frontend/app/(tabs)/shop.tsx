import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { getSkinImage } from '@/utils/skinsMapping';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { getSemanticColors } from '@/constants/accessibilityColors';


const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

interface Skin {
  id: number;
  nom: string;
  descripcio: string;
  arxiu_asset: string;
  preu_punts: number;
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth(); 
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);

  const [skins, setSkins] = useState<Skin[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [ownedSkins, setOwnedSkins] = useState<number[]>([]);
  const [activeSkinId, setActiveSkinId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadShopData();
    }
  }, [user]);

  const loadShopData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // 1. Cargamos el catálogo completo
      const skinsRes = await fetch(`${API_URL}/skins`);
      const skinsData = await skinsRes.json();
      setSkins(skinsData);

      // 2. Cargamos el inventario Y LOS PUNTOS desde tu backend
      const inventoryRes = await fetch(`${API_URL}/skins/conductor/${user.id}`);
      const data = await inventoryRes.json();
      
      // Como ahora el backend devuelve { inventari: [...], punts: X }
      const miInventario = data.inventari || [];
      const misPuntos = data.punts || 0;
      
      // Extraemos los IDs de las skins
      const ownedIds = miInventario.map((item: any) => item.id);
      const equippedSkin = miInventario.find((item: any) => item.equipada === true);
      
      setOwnedSkins(ownedIds.length > 0 ? ownedIds : [1]);
      if (equippedSkin) setActiveSkinId(equippedSkin.id);

      // 3. ACTUALIZAMOS CON LOS PUNTOS REALES DE LA BASE DE DATOS
      setUserPoints(misPuntos);

    } catch (error) {
      console.error("Error cargando tienda:", error);
      Alert.alert("Error", "No s'ha pogut connectar amb la botiga.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (skin: Skin) => {
    const isOwned = ownedSkins.includes(skin.id);

    if (isOwned) {
      equipSkin(skin.id);
    } else {
      if (userPoints >= skin.preu_punts) {
        Alert.alert(
          "Confirmar compra",
          `Vols desbloquejar ${skin.nom} per ${skin.preu_punts} punts?`,
          [
            { text: "Cancel·lar", style: "cancel" },
            { text: "Comprar", onPress: () => buySkin(skin) }
          ]
        );
      } else {
        Alert.alert("Punts insuficients", `Et falten ${skin.preu_punts - userPoints} punts.`);
      }
    }
  };

  const buySkin = async (skin: Skin) => {
    // Le decimos a TypeScript que user no es null con "!"
    if (!user!.id) return;

    setProcessingId(skin.id);
    try {
      const res = await fetch(`${API_URL}/skins/conductor/${user!.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin_id: skin.id })
      });

      const data = await res.json();

      if (res.ok) {
        setUserPoints(data.punts_restants); 
        setOwnedSkins(prev => [...prev, skin.id]);
        Alert.alert("Genial!", data.message);
      } else {
        Alert.alert("Error", data.error);
      }
    } catch (error) {
      Alert.alert("Error", "Problema de connexió.");
    } finally {
      setProcessingId(null);
    }
  };

  const equipSkin = async (skinId: number) => {
    if (!user!.id) return;

    setProcessingId(skinId);
    try {
      const res = await fetch(`${API_URL}/skins/conductor/${user!.id}/equip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin_id: skinId })
      });

      const data = await res.json();

      if (res.ok) {
        setActiveSkinId(skinId);
      } else {
        Alert.alert("Error", data.error || "Error a l'equipar");
      }
    } catch (error) {
      Alert.alert("Error", "No s'ha pogut equipar la skin.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderSkinItem = ({ item }: { item: Skin }) => {
    const isOwned = ownedSkins.includes(item.id);
    const isActive = activeSkinId === item.id;
    const isProcessing = processingId === item.id;

    return (
      <View style={[styles.card, isActive && { borderColor: sem.accent, backgroundColor: `${sem.accent}15` }]}>
        <Image source={getSkinImage(item.arxiu_asset)} style={styles.image} resizeMode="contain" />
        <Text style={styles.skinName}>{item.nom}</Text>
        <Text style={styles.skinDesc} numberOfLines={2}>{item.descripcio}</Text>
        
        <TouchableOpacity 
          style={[
            styles.button, 
            isOwned ? styles.ownedButton : { backgroundColor: sem.accent },
            isActive && { backgroundColor: 'transparent', borderWidth: 2, borderColor: sem.accent },
            isProcessing && { opacity: 0.7 }
          ]}
          onPress={() => handleAction(item)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.buttonText, isActive && { color: sem.accent }]}>
              {isActive ? "Equipat" : isOwned ? "Equipar" : `${item.preu_punts} Pts`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: '#121212' }]}><ActivityIndicator size="large" color={sem.accent} /></View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10, backgroundColor: '#121212' }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: '#ffffff' }]}>El teu Garatge</Text>
        <View style={[styles.pointsBadge, { borderColor: sem.accent }]}>
          <MaterialIcons name="electric-bolt" size={16} color={sem.accent} />
          <Text style={[styles.pointsText, { color: sem.accent }]}>{userPoints} Pts</Text>
        </View>
      </View>

      <FlatList
        data={skins}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSkinItem}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, gap: 4 },
  pointsText: { fontWeight: 'bold', fontSize: 16 },
  listContent: { paddingHorizontal: 10, paddingBottom: 80 },
  card: { flex: 1, backgroundColor: '#1E1E1E', margin: 8, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#2C2C2C', elevation: 3 },
  image: { width: 90, height: 90, marginBottom: 12 },
  skinName: { color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  skinDesc: { color: '#AAAAAA', fontSize: 11, textAlign: 'center', marginBottom: 15, height: 32 },
  button: { width: '100%', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  ownedButton: { backgroundColor: '#444444' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' }
});