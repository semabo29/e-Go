import MapViewCluster from 'react-native-map-clustering';
import { Marker, Callout } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';

// Exportamos Marker y Callout para que el index.tsx los use normalmente
export { Marker, Callout };

// Exportamos MapViewCluster con el nombre MapView para que el código sea intercambiable
export const MapView = (props: any) => {
  return (
    <MapViewCluster
      {...props}
      radius={50} // Radio de agrupación
      // Personalización del círculo del cluster
      renderCluster={(cluster: any) => {
        const { id, geometry, onPress, properties } = cluster;
        const points = properties.point_count;

        return (
          <Marker
            key={`cluster-${id}`}
            coordinate={{
              longitude: geometry.coordinates[0],
              latitude: geometry.coordinates[1],
            }}
            onPress={onPress}
          >
            <View style={styles.clusterContainer}>
              <Text style={styles.clusterText}>
                {points}
              </Text>
            </View>
          </Marker>
        );
      }}
    >
      {props.children}
    </MapViewCluster>
  );
};

// Export por defecto para evitar errores de Expo Router
export default function MapWrapper() {
  return null;
}

const styles = StyleSheet.create({
  clusterContainer: {
    backgroundColor: '#10b981', // Verde e-Go
    borderRadius: 20,
    padding: 10,
    minWidth: 40,
    height: 40,
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
    fontSize: 14,
  },
});