import MapViewCluster from 'react-native-map-clustering';
import MapView, { Marker } from 'react-native-maps';
import { View, Text } from 'react-native';

export { Marker };
export { MapView };

interface ClusteredMapViewProps {
  stations?: any[];
  userLocation?: { latitude: number; longitude: number };
  onMarkerPress?: (item: any) => void;
  [key: string]: any;
}

export function ClusteredMapView({ stations = [], userLocation, onMarkerPress, ...props }: ClusteredMapViewProps) {
  return (
    <MapViewCluster
      {...props}
      radius={50} // Distancia en píxeles para agrupar
      renderCluster={(cluster: any) => ( // ← solo 1 parámetro
        <Marker
          coordinate={cluster.coordinate}
          onPress={() => {
            // Si quieres un callback al cluster
            console.log('Cluster pulsado', cluster);
          }}
        >
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
      {props.children}
    </MapViewCluster>
  );
}
