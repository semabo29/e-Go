import { Platform } from 'react-native';

import { MapView as WebMapView, Marker as WebMarker } from './MapWrapper.web';
import { ClusteredMapView as MobileMapView, Marker as MobileMarker } from './MapWrapper.tsx';

let MapView: any;
let Marker: any;

if (Platform.OS === 'web') {
  MapView = WebMapView;
  Marker = WebMarker;
} else {
  MapView = MobileMapView;
  Marker = MobileMarker;
}

export { MapView, Marker };
export default function MapWrapper() { return null; }
