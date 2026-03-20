import MapView from 'react-native-maps';
import SuperCluster from 'react-native-maps-super-cluster';
import { Marker } from 'react-native-maps';
import { View, Text } from 'react-native';

export { Marker };

export function ClusteredMapView({ stations, userLocation, ...props }: any) {
  return (
    <MapView {...props}>
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
      <SuperCluster
        data={stations.map((s) => ({
          ...s,
          location: {
            latitude: parseFloat(s.latitud),
            longitude: parseFloat(s.longitud),
          },
        }))}
        renderMarker={(item) => (
          <Marker
            key={item.id}
            coordinate={item.location}
            onPress={() => props.onMarkerPress?.(item)}
          />
        )}
        renderCluster={(cluster) => (
          <Marker
            key={`cluster-${cluster.clusterId}`}
            coordinate={cluster.coordinate}
            onPress={() => cluster.onPress()}
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
      />
    </MapView>
  );
}