import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { calculateDistanceInMeters, getCurrentLocation } from '@/services/chargingLocationService';

interface StartChargingButtonProps {
  stationId: number;
  stationLat: number;
  stationLon: number;
  userLat: number;
  userLon: number;
  isCharging: boolean;
  onStartCharging: () => Promise<boolean>;
  onError: (message: string) => void;
}

export function StartChargingButton({
  stationId,
  stationLat,
  stationLon,
  userLat,
  userLon,
  isCharging,
  onStartCharging,
  onError,
}: StartChargingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartPress = async () => {
      setIsLoading(true);

      try {
        // 1. OBTENIR UBICACIÓ FRESCA JUST AL FER CLIC
        const freshLocation = await getCurrentLocation();
        if (!freshLocation) {
          onError('No se ha podido obtener tu ubicación actual.');
          setIsLoading(false);
          return;
        }

        const freshLat = freshLocation.coords.latitude;
        const freshLon = freshLocation.coords.longitude;

        // 2. Calcular distància amb la ubicació real i actual
        const distance = calculateDistanceInMeters(freshLat, freshLon, stationLat, stationLon);

        // Verificar si está demasiado lejos
        if (distance > 30) {
          Alert.alert(
            'Demasiado lejos',
            `Te encuentras a ${distance} metros del punto de carga.\n\nDebes acercarte a menos de 30 metros para poder iniciar la carga.`,
            [
              { text: 'Entendido', style: 'default' },
            ]
          );
          setIsLoading(false);
          return;
        }

        // Iniciar carga
        const success = await onStartCharging();

        if (!success) {
          onError('No se pudo iniciar la sesión de carga');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al iniciar carga';
        onError(message);
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <TouchableOpacity
      style={[styles.button, isCharging && styles.buttonDisabled]}
      onPress={handleStartPress}
      disabled={isCharging || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <MaterialIcons name="bolt" size={20} color="#fff" />
          <Text style={styles.buttonText}>Cargar Vehículo</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
