import React from 'react';
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker } from '@react-google-maps/api';
import { View, Text } from 'react-native';

const containerStyle = { width: '100%', height: '100%' };

const defaultOptions = {
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: false,
  panControl: false,
  scaleControl: false,
  rotateControl: false,
  keyboardShortcuts: false,
  gestureHandling: 'greedy',
  disableDefaultUI: true,
};

export const MapView = ({ children, initialRegion, style, onPress, onRegionChangeComplete, options, ...props }: any) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  // MEMORIZAMOS EL CENTRO: Así el mapa solo se centra al cargar la primera vez
  // y no "salta" cada vez que mueves el ratón o llegan datos nuevos.
  const initialCenter = React.useMemo(() => ({
    lat: initialRegion?.latitude || 41.3879,
    lng: initialRegion?.longitude || 2.16992
  }), []);

  const handleIdle = () => {
    if (map && onRegionChangeComplete) {
      const center = map.getCenter();
      const bounds = map.getBounds();
      if (center && bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        onRegionChangeComplete({
          latitude: center.lat(),
          longitude: center.lng(),
          latitudeDelta: ne.lat() - sw.lat(),
          longitudeDelta: ne.lng() - sw.lng(),
        });
      }
    }
  };

  if (!isLoaded) return (
    <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text>Cargando Mapa...</Text>
    </View>
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialCenter}
        zoom={12}
        onClick={(e) => onPress && onPress({ nativeEvent: { coordinate: { latitude: e.latLng.lat(), longitude: e.latLng.lng() } } })}
        onLoad={setMap}
        onIdle={handleIdle}
        options={{ ...defaultOptions, ...options }}
        {...props}
      >
        {children}
      </GoogleMap>
    </div>
  );
};

export const Marker = ({ coordinate, position, onPress, ...props }: any) => {
  const markerPosition = position || (coordinate ? { lat: coordinate.latitude, lng: coordinate.longitude } : null);
  if (!markerPosition) return null;

  return (
    <GoogleMarker
      position={markerPosition}
      onClick={() => onPress && onPress({ stopPropagation: () => {}, nativeEvent: { coordinate: markerPosition } })}
      {...props}
    />
  );
};
