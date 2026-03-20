import React, { useState, useEffect } from 'react'; // Añadido useEffect
import { TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  estacio_id: number;
  isInitiallyFavorite: boolean;
  onToggle?: (isFav: boolean) => void;
}

export function FavoriteButton({ estacio_id, isInitiallyFavorite, onToggle }: Props) {
  const { user } = useAuth();
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
      const res = await fetch(`${API_URL}/favorites`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuari_id: user.id, estacio_id }),
      });

      if (res.ok) {
        const newStatus = !isFavorite;
        setIsFavorite(newStatus);
        if (onToggle) onToggle(newStatus);
      } else {
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
    <TouchableOpacity onPress={toggleFavorite} disabled={loading} style={{ padding: 8 }}>
      {loading ? (
        <ActivityIndicator size="small" color="#ef4444" />
      ) : (
        <MaterialIcons
          name={isFavorite ? 'favorite' : 'favorite-border'}
          size={28}
          color={isFavorite ? '#ef4444' : '#6b7280'}
        />
      )}
    </TouchableOpacity>
  );
}