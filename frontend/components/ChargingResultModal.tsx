import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

interface ChargingResultModalProps {
  visible: boolean;
  durationMinutes: number;
  basePoints: number;
  totalPoints: number;
  multiplier: number;
  isPremium: boolean;
  isLoading: boolean;
  reason?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ChargingResultModal({
  visible,
  durationMinutes,
  basePoints,
  totalPoints,
  multiplier,
  isPremium,
  isLoading,
  reason,
  onConfirm,
}: ChargingResultModalProps) {
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createStyles(sem), [sem]);

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icono de éxito */}
          <View style={styles.iconSection}>
            <View style={styles.iconBackground}>
              <MaterialIcons name="check-circle" size={64} color={sem.accent} />
            </View>
          </View>

          {reason === 'distance_exceeded' && (
            <View style={styles.warningBox}>
              <MaterialIcons name="info-outline" size={20} color={sem.mapCustomLocation} />
              <View style={styles.warningTextWrapper}>
                <Text style={[styles.warningText, { color: sem.mapCustomLocation }]}>
                  Has salido del radio de carga (30m)
                </Text>
              </View>
            </View>
          )}

          {/* Título */}
          <Text style={styles.title}>¡Carga Completada!</Text>

          {/* Detalles de puntos */}
          <View style={styles.detailsSection}>
            {/* Duración */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons name="timer" size={18} color="#64748b" />
                <Text style={styles.detailText}>Tiempo de carga</Text>
              </View>
              <Text style={styles.detailValue}>{durationMinutes} min</Text>
            </View>

            {/* Puntos base */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons name="star" size={18} color={sem.mapCustomLocation} />
                <Text style={styles.detailText}>Puntos base</Text>
              </View>
              <Text style={styles.detailValue}>{basePoints}</Text>
            </View>

            {/* Multiplicador Premium (si aplica) */}
            {isPremium && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="auto-awesome" size={18} color={sem.mapRouteDestination} />
                  <Text style={styles.detailText}>Bonus Premium</Text>
                </View>
                <Text style={styles.detailValue}>x{multiplier}</Text>
              </View>
            )}

            {/* Total de puntos */}
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Puntos Ganados</Text>
              <Text style={styles.totalPoints}>{totalPoints}</Text>
            </View>
          </View>

          {/* Botón único de confirmación */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (sem: SemanticColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    container: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 24,
      maxWidth: '90%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    iconSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    iconBackground: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: sem.chipActiveBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#0f172a',
      textAlign: 'center',
      marginBottom: 20,
    },
    detailsSection: {
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    totalRow: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    detailText: {
      fontSize: 14,
      color: '#64748b',
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0f172a',
    },
    divider: {
      height: 1,
      backgroundColor: '#cbd5e1',
      marginVertical: 8,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0f172a',
    },
    totalPoints: {
      fontSize: 28,
      fontWeight: '800',
      color: sem.accent,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryButton: {
      backgroundColor: sem.accent,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    secondaryButton: {
      backgroundColor: '#f1f5f9',
    },
    secondaryButtonText: {
      color: '#475569',
      fontSize: 14,
      fontWeight: '700',
    },
    warningBox: {
      flexDirection: 'row',
      backgroundColor: '#fff7ed',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#ffedd5',
      alignItems: 'center',
      gap: 8,
      width: '100%',
    },
    warningTextWrapper: {
      flex: 1,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
      flexWrap: 'wrap',
    },
  });
