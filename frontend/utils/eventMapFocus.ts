//coordenadas de la ruta
export interface MapLatLng {
  latitude: number;
  longitude: number;
}

//origen estación, marcador del evento y título
export interface EventFocusMapPatch {
  routeOriginPreset: MapLatLng;
  selectedLocation: MapLatLng;
  selectedLocationLabel: string;
}

//origen = estación, destino = evento, etiqueta = título del evento
export function buildEventFocusMapPatch(
  eventLat: number,
  eventLon: number,
  title: string,
  originLat: number,
  originLon: number
): EventFocusMapPatch {
  return {
    routeOriginPreset: { latitude: originLat, longitude: originLon },
    selectedLocation: { latitude: eventLat, longitude: eventLon },
    selectedLocationLabel: title,
  };
}

//coordenadas para fitToCoordinates: [estación, evento]
export function getFitCoordinatesForEventFocus(
  originLat: number,
  originLon: number,
  eventLat: number,
  eventLon: number
): MapLatLng[] {
  return [
    { latitude: originLat, longitude: originLon },
    { latitude: eventLat, longitude: eventLon },
  ];
}

//preset = ruta desde estación sin Alert; prompt = flujo normal con Alert de origen
export type NavigationOriginResolution =
  | { type: 'preset'; origin: MapLatLng }
  | { type: 'prompt' };

//si hay preset (evento), usar estación como origen; si no, mostrar Alert en index
export function resolveNavigationOrigin(
  routeOriginPreset: MapLatLng | null
): NavigationOriginResolution {
  if (routeOriginPreset) {
    return { type: 'preset', origin: routeOriginPreset };
  }
  return { type: 'prompt' };
}

//resetea marcador, preset y etiqueta al cerrar panel o cancelar ruta
export function buildClearEventLocationPatch() {
  return {
    selectedLocation: null as MapLatLng | null,
    routeOriginPreset: null as MapLatLng | null,
    selectedLocationLabel: null as string | null,
  };
}
