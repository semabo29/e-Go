import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface ChargingTimerDisplayProps {
  elapsedSeconds: number;
  distanceToStation: number;
}

export function ChargingTimerDisplay({ elapsedSeconds, distanceToStation }: ChargingTimerDisplayProps) {
  // Convertir segundos a formato HH:MM:SS
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Determinar color basado en distancia
  const distanceColor = distanceToStation <= 30 ? '#10b981' : '#ef4444';
  const distanceStatus = distanceToStation <= 30 ? 'Conectado' : 'Fuera de rango';

  return (
    <View style={styles.container}>
      {/* Timer */}
      <View style={styles.timerSection}>
        <MaterialIcons name="timer" size={48} color="#10b981" />
        <Text style={styles.timeText}>{timeString}</Text>
        <Text style={styles.timeLabel}>Tiempo de carga</Text>
      </View>

      {/* Distancia */}
      <View style={styles.distanceSection}>
        <View style={[styles.distanceBadge, { borderColor: distanceColor }]}>
          <MaterialIcons name="location-on" size={20} color={distanceColor} />
          <View style={styles.distanceInfo}>
            <Text style={styles.distanceValue}>{distanceToStation} m</Text>
            <Text style={[styles.distanceStatus, { color: distanceColor }]}>{distanceStatus}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  distanceSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  distanceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  distanceStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});

