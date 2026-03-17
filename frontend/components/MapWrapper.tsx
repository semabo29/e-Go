import { Platform } from 'react-native';

// Este archivo decide qué versión del mapa cargar según la plataforma.
// En la web cargará MapWrapper.web.tsx automáticamente si existe.

let MapComponent: any;
let MarkerComponent: any;

if (Platform.OS === 'web') {
  // En web, importamos la versión de Google Maps
  const WebMap = require('./MapWrapper.web');
  MapComponent = WebMap.MapView;
  MarkerComponent = WebMap.Marker;
} else {
  // En nativo, importamos react-native-maps
  const NativeMap = require('react-native-maps');
  MapComponent = NativeMap.default;
  MarkerComponent = NativeMap.Marker;
}

export const MapView = MapComponent;
export const Marker = MarkerComponent;
