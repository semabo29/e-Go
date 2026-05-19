import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as Location from 'expo-location';

import {
  calculateDistanceInMeters,
  getCurrentLocation,
  isLocationServiceEnabled,
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
} from '@/services/chargingLocationService';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('chargingLocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistanceInMeters', () => {
    test('devuelve 0 para el mismo punto', () => {
      expect(calculateDistanceInMeters(41.38, 2.17, 41.38, 2.17)).toBe(0);
    });

    test('calcula distancia aproximada entre dos puntos conocidos', () => {
      const d = calculateDistanceInMeters(41.3874, 2.1686, 41.4036, 2.1744);
      expect(d).toBeGreaterThan(1000);
      expect(d).toBeLessThan(2500);
    });
  });

  describe('requestLocationPermissions', () => {
    test('true cuando el permiso es granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      } as Location.LocationPermissionResponse);
      await expect(requestLocationPermissions()).resolves.toBe(true);
    });

    test('false cuando el permiso no es granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
      } as Location.LocationPermissionResponse);
      await expect(requestLocationPermissions()).resolves.toBe(false);
    });

    test('false si la petición lanza error', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockRejectedValue(new Error('fail'));
      await expect(requestLocationPermissions()).resolves.toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    test('devuelve ubicación en éxito', async () => {
      const loc = {
        coords: { latitude: 1, longitude: 2, accuracy: 5, altitude: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
        timestamp: Date.now(),
      } as Location.LocationObject;
      mockLocation.getCurrentPositionAsync.mockResolvedValue(loc);
      await expect(getCurrentLocation()).resolves.toBe(loc);
    });

    test('devuelve null si falla', async () => {
      mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('gps off'));
      await expect(getCurrentLocation()).resolves.toBeNull();
    });
  });

  describe('startLocationTracking', () => {
    test('devuelve función remove de la suscripción', async () => {
      const remove = jest.fn();
      mockLocation.watchPositionAsync.mockResolvedValue({ remove } as Location.LocationSubscription);
      const onChange = jest.fn();
      const unsubscribe = await startLocationTracking(onChange);
      expect(unsubscribe).toBe(remove);
      expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    });

    test('invoca callback cuando watchPosition emite', async () => {
      const loc = {
        coords: { latitude: 3, longitude: 4, accuracy: 1, altitude: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
        timestamp: 1,
      } as Location.LocationObject;
      mockLocation.watchPositionAsync.mockImplementation(async (_opts, cb) => {
        cb(loc);
        return { remove: jest.fn() } as Location.LocationSubscription;
      });
      const onChange = jest.fn();
      await startLocationTracking(onChange);
      expect(onChange).toHaveBeenCalledWith(loc);
    });

    test('devuelve null si watchPosition falla', async () => {
      mockLocation.watchPositionAsync.mockRejectedValue(new Error('no gps'));
      await expect(startLocationTracking(jest.fn())).resolves.toBeNull();
    });
  });

  describe('stopLocationTracking', () => {
    test('llama a unsubscribe si existe', () => {
      const unsubscribe = jest.fn();
      stopLocationTracking(unsubscribe);
      expect(unsubscribe).toHaveBeenCalled();
    });

    test('no lanza si unsubscribe es null', () => {
      expect(() => stopLocationTracking(null)).not.toThrow();
    });
  });

  describe('isLocationServiceEnabled', () => {
    test('devuelve true cuando los servicios están activos', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
      await expect(isLocationServiceEnabled()).resolves.toBe(true);
    });

    test('devuelve false si falla la comprobación', async () => {
      mockLocation.hasServicesEnabledAsync.mockRejectedValue(new Error('err'));
      await expect(isLocationServiceEnabled()).resolves.toBe(false);
    });
  });
});
