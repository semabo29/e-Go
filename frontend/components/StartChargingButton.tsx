import React, { useMemo, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

import { getSemanticColors } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

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
  isCharging,
  onStartCharging,
  onError,
}: StartChargingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);

  const handleStartPress = async () => {
    setIsLoading(true);

    try {
      // Ara tota la lògica pesada (GPS, distància, alertes) la fa el index.tsx
      // Només hem d'esperar a que acabi.
      await onStartCharging();

    } catch (error) {
      const message = error instanceof Error ? error.message : t('startCharging.errorGeneric');
      onError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: sem.accent }, isCharging && styles.buttonDisabled]}
      onPress={handleStartPress}
      disabled={isCharging || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <MaterialIcons name="bolt" size={20} color="#fff" />
          <Text style={styles.buttonText}>{t('startCharging.label')}</Text>
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