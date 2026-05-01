import * as Location from 'expo-location';

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lon1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lon2 - Longitud del segundo punto
 * @returns {number} Distancia en metros
 */
export function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance); // Retorna distancia en metros redondeada
}

/**
 * Solicita permisos de ubicación al dispositivo
 * @returns {Promise<boolean>} true si los permisos fueron otorgados
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error solicitando permisos de ubicación:', error);
    return false;
  }
}

/**
 * Obtiene la ubicación actual del usuario
 * @returns {Promise<Location.LocationObject|null>} Ubicación actual o null si falla
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return location;
  } catch (error) {
    console.error('Error obteniendo ubicación actual:', error);
    return null;
  }
}

/**
 * Inicia el monitoreo de ubicación en tiempo real
 * @param {(location: Location.LocationObject) => void} onLocationChange - Callback cuando la ubicación cambia
 * @returns {Promise<string>} ID de la suscripción (para detenerla después)
 */
export async function startLocationTracking(
  onLocationChange: (location: Location.LocationObject) => void
): Promise<(() => void) | null> {
  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Actualizar cada 5 segundos
        distanceInterval: 10, // O si se mueve más de 10 metros
      },
      onLocationChange
    );
    return subscription.remove; // Retorna la función para detener el monitoreo
  } catch (error) {
    console.error('Error iniciando monitoreo de ubicación:', error);
    return null;
  }
}

/**
 * Detiene el monitoreo de ubicación
 * @param {() => void} unsubscribe - Función para detener el monitoreo
 */
export function stopLocationTracking(unsubscribe: (() => void) | null): void {
  if (unsubscribe) {
    unsubscribe();
  }
}

/**
 * Verifica si la ubicación está habilitada en el dispositivo
 * @returns {Promise<boolean>} true si está habilitada
 */
export async function isLocationServiceEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.error('Error verificando servicios de ubicación:', error);
    return false;
  }
}

