import React, { useState, useEffect, useMemo } from 'react'; // Añadido useEffect
import { TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { appFetch } from '@/services/appFetch';
import { getApiUrl } from '@/constants/api';
import { getSemanticColors } from '@/constants/accessibilityColors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

interface Props {
  estacio_id: number;
  isInitiallyFavorite: boolean;
  onToggle?: (isFav: boolean) => void;
}

export function FavoriteButton({ estacio_id, isInitiallyFavorite, onToggle }: Props) {
  const { user } = useAuth();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const [isFavorite, setIsFavorite] = useState(isInitiallyFavorite);
  const [loading, setLoading] = useState(false);

  // Sincronizar cuando cambias de estación en el mapa
  useEffect(() => {
    setIsFavorite(isInitiallyFavorite);
  }, [isInitiallyFavorite, estacio_id]);

  const toggleFavorite = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const res = await appFetch('/favorites', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuari_id: user.id, estacio_id }),
      });

      if (res.ok) {
        const newStatus = !isFavorite;
        setIsFavorite(newStatus);
        if (onToggle) onToggle(newStatus);
      } else if (res.status !== 403) {
        Alert.alert("Error", "No se pudo actualizar el favorito");
      }
    } catch (e) {
      console.error('Error al cambiar favorito', e);
      Alert.alert("Error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      testID="favorite-button"
      onPress={toggleFavorite}
      disabled={loading}
      style={{ padding: 8 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={sem.favorite} />
      ) : (
        <MaterialIcons
          name={isFavorite ? 'favorite' : 'favorite-border'}
          size={28}
          color={isFavorite ? sem.favorite : '#6b7280'}
        />
      )}
    </TouchableOpacity>
  );
}