import React from 'react';
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker } from '@react-google-maps/api';
import { View, Text } from 'react-native';

const containerStyle = {
  width: '100%',
  height: '100%',
};

export const MapView = ({ children, initialRegion, center, zoom, style, ...props }: any) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const mapCenter = center || (initialRegion ? {
    lat: initialRegion.latitude,
    lng: initialRegion.longitude,
  } : { lat: 41.3879, lng: 2.16992 });

  const mapZoom = zoom || 13;

  if (!isLoaded) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Text>Cargando Mapa...</Text>
      </View>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        {...props}
      >
        {children}
      </GoogleMap>
    </div>
  );
};

export const Marker = ({ coordinate, position, ...props }: any) => {
  const markerPosition = position || (coordinate ? {
    lat: coordinate.latitude,
    lng: coordinate.longitude,
  } : null);

  if (!markerPosition) return null;

  return <GoogleMarker position={markerPosition} {...props} />;
};
