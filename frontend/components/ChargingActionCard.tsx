import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface ChargingActionCardProps {
  isCharging: boolean;
  elapsedSeconds: number;
  distanceToStation: number | null;
  onFinishCharging: () => void;
  onCancelCharging: () => void;
}

export function ChargingActionCard({
  isCharging,
  elapsedSeconds,
  distanceToStation,
  onFinishCharging,
  onCancelCharging,
}: ChargingActionCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createStyles(isDark, sem), [isDark, sem]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minutes = Math.floor(elapsedSeconds / 60);

  const handleFinishPress = () => {
    if (minutes < 1) {
      Alert.alert('Tiempo insuficiente', 'Debes cargar al menos 1 minuto para registrar puntos.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmFinish = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      await onFinishCharging();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCharging) return null;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.statusSection}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: sem.accent }]} />
            <Text style={[styles.statusText, { color: sem.accent }]}>Cargando...</Text>
          </View>
          <Text style={styles.minutesText}>{minutes} min de carga</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.finishButton, { backgroundColor: sem.accent }]}
            onPress={handleFinishPress}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.finishButtonText}>Finalizar Carga</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancelCharging}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <MaterialIcons name="close" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {(distanceToStation !== null && distanceToStation > 30) && (
          <View style={styles.warningSection}>
            <MaterialIcons name="warning" size={16} color={sem.error} />
            <Text style={[styles.warningText, { color: sem.error }]}>Te estás alejando del punto de carga</Text>
          </View>
        )}
      </View>

      <Modal visible={showConfirmModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Finalizar carga?</Text>
            <Text style={styles.modalMessage}>
              Habrás completado {minutes} minutos de carga y recibirás {minutes * 10} puntos{'\n'}
              {minutes > 0 ? '(puede ser más con bonificación Premium)' : ''}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Continuar cargando</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton, { backgroundColor: sem.accent }]}
                onPress={handleConfirmFinish}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (isDark: boolean, sem: SemanticColors) => StyleSheet.create({
  container: {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: isDark ? 1 : 0,
    borderColor: '#334155',
  },
  statusSection: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  minutesText: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? Colors.dark.text : '#0f172a',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  finishButton: {
    // Color gestionat per sem.accent directament al component
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#e2e8f0',
  },
  cancelButtonText: {
    color: isDark ? '#94a3b8' : '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 20,
    maxWidth: '85%',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? Colors.dark.text : '#0f172a',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: isDark ? '#94a3b8' : '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
  },
  modalConfirmButton: {
    // Declarat per evitar errors de TS, el fons s'aplica per inline style
  },
  modalCancelText: {
    color: isDark ? '#cbd5e1' : '#475569',
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});