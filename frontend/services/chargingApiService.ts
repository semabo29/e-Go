import { getApiUrl } from '@/constants/api';

export interface ChargingSessionResponse {
  success: boolean;
  session: {
    id: number;
    usuari_id: number;
    estacio_id: number;
    inicio: string;
    fin: string | null;
    duracion_minutos: number | null;
    puntos_totales: number | null;
    status: string;
  };
}

export interface ChargingEndResponse {
  success: boolean;
  message: string;
  session: {
    id: number;
    puntos_totales: number;
  };
  pointsGained: {
    basePoints: number;
    multiplier: number;
    totalPoints: number;
  };
  isPremium: boolean;
}

/**
 * Inicia una sesión de carga en el backend
 */
export async function startChargingSession(
  usuariId: number,
  estacioId: number,
  ubicacionLat: number,
  ubicacionLon: number
): Promise<ChargingSessionResponse> {
  const response = await fetch(`${getApiUrl()}/charging/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usuari_id: usuariId,
      estacio_id: estacioId,
      ubicacion_lat: ubicacionLat,
      ubicacion_lon: ubicacionLon,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al iniciar sesión de carga');
  }

  return response.json();
}

/**
 * Finaliza una sesión de carga en el backend
 */
export async function endChargingSession(
  sessionId: number,
  usuariId: number,
  durationMinutes: number,
  ubicacionFinalLat: number | null,
  ubicacionFinalLon: number | null,
  endReason: 'manual' | 'distance_exceeded' | 'signal_loss'
): Promise<ChargingEndResponse> {
  const response = await fetch(`${getApiUrl()}/charging/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      usuari_id: usuariId,
      duration_minutes: durationMinutes,
      ubicacion_final_lat: ubicacionFinalLat,
      ubicacion_final_lon: ubicacionFinalLon,
      end_reason: endReason,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al finalizar sesión de carga');
  }

  return response.json();
}

/**
 * Obtiene la sesión activa del usuario
 */
export async function getActiveChargingSession(usuariId: number): Promise<ChargingSessionResponse | null> {
  const response = await fetch(`${getApiUrl()}/charging/active?usuari_id=${usuariId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Error al obtener sesión activa');
  }

  const data = await response.json();
  return data.session;
}

/**
 * Cancela una sesión de carga
 */
export async function cancelChargingSession(
  sessionId: number,
  reason?: string
): Promise<void> {
  const response = await fetch(`${getApiUrl()}/charging/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      reason: reason || 'manual',
    }),
  });

  if (!response.ok) {
    throw new Error('Error al cancelar sesión');
  }
}

/**
 * Obtiene estadísticas de carga del usuario
 */
export async function getChargingStats(usuariId: number) {
  const response = await fetch(`${getApiUrl()}/charging/stats/${usuariId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }

  return response.json();
}

