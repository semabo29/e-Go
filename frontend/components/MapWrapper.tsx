import MapViewCluster from 'react-native-map-clustering';
import MapView, { Marker } from 'react-native-maps';
import { View, Text } from 'react-native';

export { Marker };
export { MapView };

interface ClusteredMapViewProps {
  stations: any[];
  userLocation?: { latitude: number; longitude: number };
  onMarkerPress?: (item: any) => void;
  [key: string]: any;
}

export function ClusteredMapView({ stations, userLocation, onMarkerPress, ...props }: ClusteredMapViewProps) {
  return (
    <MapViewCluster
      {...props}
      radius={50} // Distance in pixels to cluster markers
      renderCluster={(cluster, onPress) => (
        <Marker coordinate={cluster.coordinate} onPress={onPress}>
          <View style={{
            backgroundColor: '#10b981',
            borderRadius: 20,
            padding: 8,
            borderWidth: 2,
            borderColor: '#fff',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {cluster.pointCount}
            </Text>
          </View>
        </Marker>
      )}
    >
      {userLocation && (
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          title="Tu ubicación"
          pinColor="blue"
        />
      )}

      {stations.map((s) => (
        <Marker
          key={s.id}
          coordinate={{
            latitude: parseFloat(s.latitud),
            longitude: parseFloat(s.longitud),
          }}
          onPress={() => onMarkerPress?.(s)}
        />
      ))}
    </MapViewCluster>
  );
}
