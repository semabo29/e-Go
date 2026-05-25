import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { getSkinImage } from '@/utils/skinsMapping';
import { useAuth } from '@/contexts/AuthContext';
import type { ScreenTheme } from '@/constants/screenTheme';
import { useScreenTheme } from '@/hooks/use-screen-theme';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}`;

interface Skin {
  id: number;
  nom: string;
  descripcio: string;
  arxiu_asset: string;
  preu_punts: number;
}

export default function ShopScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const theme = useScreenTheme();
  const styles = useMemo(() => createShopStyles(theme), [theme.isDark, theme.sem]);

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

      const skinsRes = await fetch(`${API_URL}/skins`);
      const skinsData = await skinsRes.json();
      setSkins(skinsData);

      const inventoryRes = await fetch(`${API_URL}/skins/conductor/${user.id}`);
      const data = await inventoryRes.json();

      const miInventario = data.inventari || [];
      const misPuntos = data.punts || 0;

      const ownedIds = miInventario.map((item: { id: number }) => item.id);
      const equippedSkin = miInventario.find((item: { equipada?: boolean }) => item.equipada === true);

      setOwnedSkins(ownedIds.length > 0 ? ownedIds : [1]);
      if (equippedSkin) setActiveSkinId(equippedSkin.id);

      setUserPoints(misPuntos);
    } catch (error) {
      console.error('Error cargando tienda:', error);
      Alert.alert(t('common.error'), t('shop.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (skin: Skin) => {
    const isOwned = ownedSkins.includes(skin.id);

    if (isOwned) {
      equipSkin(skin.id);
    } else if (userPoints >= skin.preu_punts) {
      Alert.alert(
        t('shop.confirmTitle'),
        t('shop.confirmBody', { name: skin.nom, price: skin.preu_punts }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('shop.buy'), onPress: () => buySkin(skin) },
        ]
      );
    } else {
      Alert.alert(
        t('shop.insufficientTitle'),
        t('shop.insufficientBody', { count: skin.preu_punts - userPoints })
      );
    }
  };

  const buySkin = async (skin: Skin) => {
    if (!user!.id) return;

    setProcessingId(skin.id);
    try {
      const res = await fetch(`${API_URL}/skins/conductor/${user!.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin_id: skin.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setUserPoints(data.punts_restants);
        setOwnedSkins((prev) => [...prev, skin.id]);
        Alert.alert(t('shop.purchaseSuccessTitle'), data.message);
      } else {
        Alert.alert(t('common.error'), data.error);
      }
    } catch {
      Alert.alert(t('common.error'), t('shop.connectionError'));
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
        body: JSON.stringify({ skin_id: skinId }),
      });

      const data = await res.json();

      if (res.ok) {
        setActiveSkinId(skinId);
      } else {
        Alert.alert(t('common.error'), data.error || t('shop.equipError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('shop.equipFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  const renderSkinItem = ({ item }: { item: Skin }) => {
    const isOwned = ownedSkins.includes(item.id);
    const isActive = activeSkinId === item.id;
    const isProcessing = processingId === item.id;

    let buttonLabel: string;
    if (isActive) {
      buttonLabel = t('shop.equipped');
    } else if (isOwned) {
      buttonLabel = t('shop.equip');
    } else {
      buttonLabel = t('shop.pricePts', { count: item.preu_punts });
    }

    return (
      <View style={[styles.card, isActive && { borderColor: theme.sem.accent, backgroundColor: `${theme.sem.accent}15` }]}>
        <Image source={getSkinImage(item.arxiu_asset)} style={styles.image} resizeMode="contain" />
        <Text style={styles.skinName}>{item.nom}</Text>
        <Text style={styles.skinDesc} numberOfLines={2}>
          {item.descripcio}
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            isOwned ? styles.ownedButton : { backgroundColor: theme.sem.accent },
            isActive && { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.sem.accent },
            isProcessing && { opacity: 0.7 },
          ]}
          onPress={() => handleAction(item)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.buttonText, isActive && { color: theme.sem.accent }]}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.shopBg }]}>
        <ActivityIndicator size="large" color={theme.sem.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10, backgroundColor: theme.shopBg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.shopText }]}>{t('shop.title')}</Text>
        <View style={[styles.pointsBadge, { borderColor: theme.sem.accent }]}>
          <MaterialIcons name="electric-bolt" size={16} color={theme.sem.accent} />
          <Text style={[styles.pointsText, { color: theme.sem.accent }]}>
            {t('shop.points', { count: userPoints })}
          </Text>
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

const createShopStyles = (theme: ScreenTheme) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    headerTitle: { fontSize: 26, fontWeight: 'bold' },
    pointsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.shopCardBg,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      gap: 4,
    },
    pointsText: { fontWeight: 'bold', fontSize: 16 },
    listContent: { paddingHorizontal: 10, paddingBottom: 80 },
    card: {
      flex: 1,
      backgroundColor: theme.shopCardBg,
      margin: 8,
      padding: 15,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.shopCardBorder,
      elevation: 3,
    },
    image: { width: 90, height: 90, marginBottom: 12 },
    skinName: { color: theme.shopText, fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
    skinDesc: { color: theme.shopMuted, fontSize: 11, textAlign: 'center', marginBottom: 15, height: 32 },
    button: {
      width: '100%',
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    ownedButton: { backgroundColor: theme.shopOwnedBtnBg },
    buttonText: { color: theme.shopText, fontSize: 14, fontWeight: 'bold' },
  });
