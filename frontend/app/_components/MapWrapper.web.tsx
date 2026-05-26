import React from 'react';
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker } from '@react-google-maps/api';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultOptions = {
  fullscreenControl: false,    // Elimina el botón de pantalla completa
  mapTypeControl: false,       // Elimina el selector de tipo de mapa
  streetViewControl: false,    // Elimina el monigote de Street View
  zoomControl: false,          // Elimina los botones de zoom
  panControl: false,           // Elimina el control de desplazamiento
  scaleControl: false,         // Elimina la escala
  rotateControl: false,        // Elimina el control de rotación
  keyboardShortcuts: false,    // Desactiva atajos de teclado
  gestureHandling: 'greedy',   // Opcional: mejora el scroll en móviles web
  disableDefaultUI: true,      // DESACTIVA TODA LA UI POR DEFECTO DE GOLPE
};

export const MapView = ({ children, initialRegion, center, zoom, style, onPress, options, ...props }: any) => {
  const { t } = useTranslation();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const mapCenter = center || (initialRegion ? {
    lat: initialRegion.latitude,
    lng: initialRegion.longitude,
  } : { lat: 41.3879, lng: 2.16992 });

  const mapZoom = zoom || 13;

  const handleMapClick = (e: any) => {
    if (onPress) {
      onPress({
        nativeEvent: {
          coordinate: {
            latitude: e.latLng.lat(),
            longitude: e.latLng.lng(),
          },
        },
      });
    }
  };

  if (!isLoaded) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Text>{t('common.loadingMap')}</Text>
      </View>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onClick={handleMapClick}
        options={{ ...defaultOptions, ...options }}
        {...props}
      >
        {children}
      </GoogleMap>
    </div>
  );
};

export const Marker = ({ coordinate, position, onPress, ...props }: any) => {
  const markerPosition = position || (coordinate ? {
    lat: coordinate.latitude,
    lng: coordinate.longitude,
  } : null);

  if (!markerPosition) return null;

  const handleMarkerClick = (e: any) => {
    if (onPress) {
      // Simulamos la estructura de evento de react-native-maps
      onPress({
        stopPropagation: () => {},
        nativeEvent: {
          coordinate: markerPosition,
        },
      });
    }
  };

  return <GoogleMarker position={markerPosition} onClick={handleMarkerClick} {...props} />;
};

export default function MapWrapperWeb() {
  return null;
}
