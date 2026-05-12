import React, { forwardRef } from 'react';
import MapViewCluster from 'react-native-map-clustering';
import { Marker, Callout } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';

// Exportamos Marker y Callout para que el index.tsx los use normalmente
export { Marker, Callout };

function formatClusterCount(points: number) {
  return String(points);
}

export const MapView = forwardRef((props: any, ref: any) => {
  return (
    <MapViewCluster
      ref={ref} // <--- ¡ESTA LÍNEA ES VITAL PARA LA NAVEGACIÓN!
      {...props}
      radius={50} // Radio de agrupación
      // Personalización del círculo del cluster
      renderCluster={(cluster: any) => {
        const { id, geometry, onPress, properties } = cluster;
        const points = properties.point_count;
        const label = formatClusterCount(points);

        const size = points >= 100 ? 58 : points >= 30 ? 52 : 46;
        return (
          <Marker
            key={`cluster-${id}`}
            coordinate={{
              longitude: geometry.coordinates[0],
              latitude: geometry.coordinates[1],
            }}
            onPress={onPress}
          >
            <View style={[styles.clusterContainer, { minWidth: size, minHeight: size }]}>
              <Text style={styles.clusterText}>
                {label}
              </Text>
            </View>
          </Marker>
        );
      }}
    >
      {props.children}
    </MapViewCluster>
  );
});

MapView.displayName = 'MapView';

// Export por defecto para evitar errores de Expo Router
export default function MapWrapper() {
  return null;
}

const styles = StyleSheet.create({
  clusterContainer: {
    backgroundColor: '#10b981', // Verde e-Go
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 46,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  clusterText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12.5,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});