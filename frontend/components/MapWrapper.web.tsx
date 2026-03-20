import React, { forwardRef, useImperativeHandle, useMemo, useState, Children, isValidElement, cloneElement } from 'react';
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker, MarkerClusterer } from '@react-google-maps/api';
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

export const MapView = forwardRef((props: any, ref) => {
  const {
    children,
    initialRegion,
    style,
    onPress,
    onRegionChangeComplete,
    options,
    ...otherProps
  } = props;

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      if (map) {
        map.panTo({ lat: region.latitude, lng: region.longitude });
        const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
        map.setZoom(zoom);
      }
    }
  }));

  const initialCenter = useMemo(() => ({
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
        const latDelta = Math.max(0.0001, ne.lat() - sw.lat());
        const lngDelta = Math.max(0.0001, ne.lng() - sw.lng());
        onRegionChangeComplete({
          latitude: center.lat(),
          longitude: center.lng(),
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        });
      }
    }
  };

  const handleClusterClick = (cluster: any) => {
    if (map) {
      const center = cluster.getCenter();
      map.panTo(center);
      map.setZoom((map.getZoom() || 12) + 2);
    }
  };

  if (!isLoaded) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Text>Cargando Mapa...</Text>
      </View>
    );
  }

  const clusterableMarkers: any[] = [];
  const otherChildren: any[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      if ((child.props as any).isUserLocation) {
        otherChildren.push(child);
      } else {
        clusterableMarkers.push(child);
      }
    }
  });

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={map ? undefined : initialCenter}
        zoom={map ? undefined : 12}
        onLoad={(m) => setMap(m)}
        onIdle={handleIdle}
        onZoomChanged={handleIdle}
        onClick={(e) => {
          if (e.latLng && onPress) {
            onPress({ nativeEvent: { coordinate: { latitude: e.latLng.lat(), longitude: e.latLng.lng() } } });
          }
        }}
        options={{ ...defaultOptions, ...options }}
        {...otherProps}
      >
        <MarkerClusterer
          key={clusterableMarkers.length}
          onClick={handleClusterClick}
          options={{
            imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
            gridSize: 50,
            minimumClusterSize: 2,
            maxZoom: 15,
            zoomOnClick: false,
          }}
        >
          {(clusterer) => (
            <>
              {clusterableMarkers.map((child, index) =>
                cloneElement(child, { key: `c-${index}`, clusterer } as any)
              )}
            </>
          )}
        </MarkerClusterer>
        {otherChildren}
      </GoogleMap>
    </div>
  );
});

MapView.displayName = "MapView";

export const Marker = ({ coordinate, position, onPress, clusterer, ...props }: any) => {
  const pos = position || (coordinate ? { lat: coordinate.latitude, lng: coordinate.longitude } : null);
  if (!pos) return null;

  return (
    <GoogleMarker
      position={pos}
      clusterer={clusterer}
      onClick={() => {
        if (onPress) {
          onPress({ stopPropagation: () => {}, nativeEvent: { coordinate: pos } });
        }
      }}
      {...props}
    />
  );
};
