import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { getApiUrl } from '@/constants/api';
import { calculateDistanceInMeters, startLocationTracking, stopLocationTracking } from '@/services/chargingLocationService';
import { useAuth } from './AuthContext';
import { endChargingSession as apiEndCharging } from '@/services/chargingApiService';

interface ChargingSession {
  id?: number;
  sessionStartTime: number; // timestamp en ms
  stationId: number;
  stationLat: number;
  stationLon: number;
  userLat: number;
  userLon: number;
  distanceToStation: number; // en metros
  elapsedSeconds: number;
}

interface ChargingContextType {
  isCharging: boolean;
  session: ChargingSession | null;
  distanceToStation: number;
  elapsedSeconds: number;
  startChargingSession: (stationId: number, stationLat: number, stationLon: number, userLat: number, userLon: number) => Promise<boolean>;
  updateSessionId: (id: number) => void;
  stopChargingSession: (reason: 'manual' | 'distance_exceeded' | 'signal_loss') => Promise<any>;
  cancelChargingSession: () => void;
  autoStopResult: any | null;
  clearAutoStopResult: () => void;
}

const ChargingContext = createContext<ChargingContextType | null>(null);

export function ChargingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isCharging, setIsCharging] = useState(false);
  const [session, setSession] = useState<ChargingSession | null>(null);
  const [distanceToStation, setDistanceToStation] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const locationUnsubscribeRef = useRef<(() => void) | null>(null);
  const signalLossTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationUpdateRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<number | null>(null);

  const isChargingRef = useRef(false);
  const sessionRef = useRef<ChargingSession | null>(null);
  const userRef = useRef(user);

  const [autoStopResult, setAutoStopResult] = useState<any | null>(null);
  const clearAutoStopResult = useCallback(() => setAutoStopResult(null), []);

  useEffect(() => {
      isChargingRef.current = isCharging;
      sessionRef.current = session;
      userRef.current = user;
    }, [isCharging, session, user]);

  // Timer que actualiza cada segundo
  useEffect(() => {
    if (!isCharging || !session) return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        setSession((prevSession) => {
          if (prevSession) {
            return {
              ...prevSession,
              elapsedSeconds: prev + 1,
            };
          }
          return null;
        });
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCharging, session]);

  const startChargingSession = useCallback(
    async (stationId: number, stationLat: number, stationLon: number, userLat: number, userLon: number): Promise<boolean> => {
      try {
        // Calcular distancia inicial
        const initialDistance = calculateDistanceInMeters(userLat, userLon, stationLat, stationLon);

        if (initialDistance > 30) {
          return false; // Demasiado lejos
        }

        // Crear sesión
        const newSession: ChargingSession = {
          sessionStartTime: Date.now(),
          stationId,
          stationLat,
          stationLon,
          userLat,
          userLon,
          distanceToStation: initialDistance,
          elapsedSeconds: 0,
        };

        setSession(newSession);
        setIsCharging(true);
        setElapsedSeconds(0);
        setDistanceToStation(initialDistance);
        lastLocationUpdateRef.current = Date.now();
        sessionIdRef.current = null; // Reiniciar ID al empezar

        // Iniciar monitoreo de ubicación
        const unsubscribe = await startLocationTracking((location) => {
          lastLocationUpdateRef.current = Date.now();

          // Calcular nueva distancia
          const newDistance = calculateDistanceInMeters(
            location.coords.latitude,
            location.coords.longitude,
            stationLat,
            stationLon
          );

          setDistanceToStation(newDistance);
          setSession((prevSession) => {
            if (prevSession) {
              return {
                ...prevSession,
                userLat: location.coords.latitude,
                userLon: location.coords.longitude,
                distanceToStation: newDistance,
              };
            }
            return null;
          });

          // Si se aleja más de 30 metros, detener automáticamente
          if (newDistance > 30) {
              const handleAutoStop = async () => {
                  const res = await stopChargingSession('distance_exceeded');
                  if (res) {
                      setAutoStopResult(res);
                  }
              };
              handleAutoStop();
          }
        });

        if (unsubscribe) {
          locationUnsubscribeRef.current = unsubscribe;
        }

        return true;
      } catch (error) {
        console.error('Error iniciando sesión de carga:', error);
        return false;
      }
    },
    []
  );

  // Actualitzar l'ID quan el backend respongui
    const updateSessionId = useCallback((id: number) => {
        sessionIdRef.current = id;
        setSession((prev) => (prev ? { ...prev, id } : null));
    }, []);

    const stopChargingSession = useCallback(
      async (reason: 'manual' | 'distance_exceeded' | 'signal_loss') => {
        // UTILITZEM EL REF EN LLOC DE L'ESTAT!
        if (!isChargingRef.current) return;

        isChargingRef.current = false;

        try {
          // 1. Netejar timers i ubicació IMMEDIATAMENT
          if (timerRef.current) clearInterval(timerRef.current);
          if (signalLossTimerRef.current) clearInterval(signalLossTimerRef.current);
          if (locationUnsubscribeRef.current) {
            stopLocationTracking(locationUnsubscribeRef.current);
            locationUnsubscribeRef.current = null;
          }

          // 2. Preparar dades de tancament (UTILITZEM EL REF DE LA SESSIÓ!)
          const sessionToClose = sessionRef.current;
          const finalElapsedSeconds = sessionToClose?.elapsedSeconds || 0;
          const durationMinutes = Math.floor(finalElapsedSeconds / 60);
          let apiResponse = null;

          // 3. ÚNICA CRIDA AL BACKEND
          const currentUser = userRef.current;
          if (currentUser?.id && (sessionIdRef.current || sessionToClose?.id)) {
              try {
                  apiResponse = await apiEndCharging(
                      sessionIdRef.current || sessionToClose?.id || 0,
                      currentUser.id,
                      durationMinutes,
                      sessionToClose?.userLat || 0,
                      sessionToClose?.userLon || 0,
                      reason
                  );
                  console.log('Sessió tancada al backend correctament');
              } catch (apiError) {
                  console.error('Error enviant finalització al backend:', apiError);
              }
          }

          // 4. Retornem tot el necessari (ABANS d'apagar l'isCharging)
          const finalResult = {
            durationMinutes,
            reason,
            session: sessionToClose,
            apiResponse
          };

          // 5. APAGAR L'ESTAT AL FINAL
          setIsCharging(false);

          return finalResult;
        } catch (error) {
          console.error('Error deteniendo sesión de carga:', error);
          setIsCharging(false);
          return null;
        }
      },
      [user] // <-- Hem netejat les dependències per evitar problemes
    );


  const cancelChargingSession = useCallback(() => {
    // Detener timer
    if (timerRef.current) clearInterval(timerRef.current);
    if (signalLossTimerRef.current) clearInterval(signalLossTimerRef.current);

    // Detener monitoreo de ubicación
    if (locationUnsubscribeRef.current) {
      stopLocationTracking(locationUnsubscribeRef.current);
      locationUnsubscribeRef.current = null;
    }

    setIsCharging(false);
    setSession(null);
    setElapsedSeconds(0);
    setDistanceToStation(0);
    sessionIdRef.current = null;
  }, []);

  return (
    <ChargingContext.Provider
      value={{
        isCharging,
        session,
        distanceToStation,
        elapsedSeconds,
        startChargingSession,
        updateSessionId,
        stopChargingSession,
        cancelChargingSession,
        autoStopResult,
        clearAutoStopResult,
      }}
    >
      {children}
    </ChargingContext.Provider>
  );
}

export function useCharging() {
  const context = useContext(ChargingContext);
  if (!context) throw new Error('useCharging debe usarse dentro de ChargingProvider');
  return context;
}