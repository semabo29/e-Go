import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface ChargingTimerDisplayProps {
  elapsedSeconds: number;
  distanceToStation: number | null;
}

export function ChargingTimerDisplay({ elapsedSeconds, distanceToStation }: ChargingTimerDisplayProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createStyles(isDark, sem), [isDark, sem]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const hasDistance = distanceToStation !== null;
  const isConnected = hasDistance && distanceToStation <= 30;

  const distanceColor = !hasDistance ? (isDark ? '#94a3b8' : '#94a3b8') : (isConnected ? sem.accent : sem.error);
  const distanceStatus = !hasDistance ? 'Calculando...' : (isConnected ? 'Conectado' : 'Fuera de rango');

  return (
    <View style={styles.container}>
      <View style={styles.timerSection}>
        <MaterialIcons name="timer" size={48} color={sem.accent} />
        <Text style={styles.timeText}>{timeString}</Text>
        <Text style={styles.timeLabel}>Tiempo de carga</Text>
      </View>

      <View style={styles.distanceSection}>
        <View style={[styles.distanceBadge, { borderColor: distanceColor }]}>
          <MaterialIcons name="location-on" size={20} color={distanceColor} />
          <View style={styles.distanceInfo}>
            <Text style={styles.distanceValue}>
              {hasDistance ? `${distanceToStation} m` : '-- m'}
            </Text>
            <Text style={[styles.distanceStatus, { color: distanceColor }]}>{distanceStatus}</Text>
          </View>
        </View>
      </View>
    </View>
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
  timerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    color: isDark ? Colors.dark.text : '#0f172a',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  timeLabel: {
    fontSize: 12,
    color: isDark ? '#94a3b8' : '#64748b',
    marginTop: 4,
  },
  distanceSection: {
    borderTopWidth: 1,
    borderTopColor: isDark ? '#334155' : '#e2e8f0',
    paddingTop: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
  },
  distanceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? Colors.dark.text : '#0f172a',
  },
  distanceStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});