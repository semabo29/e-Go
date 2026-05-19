import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.unmock('@/contexts/ChargingContext');

type LocationUpdateCb = (location: {
  coords: { latitude: number; longitude: number };
}) => void;

const mockCalculateDistance = jest.fn<any>();
const mockStartTracking = jest.fn<any>();
const mockStopTracking = jest.fn<any>();
const mockEndCharging = jest.fn<any>();
const mockCancelCharging = jest.fn<any>();

jest.mock('@/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: {
      id: 42,
      email: 'u@test.com',
      username: 'u',
      created_at: '',
      updated_at: '',
    },
  }),
}));

jest.mock('@/constants/api', () => ({
  getApiUrl: () => 'http://test.api',
}));

jest.mock('expo-location', () => ({}));

jest.mock('@/services/chargingLocationService', () => ({
  calculateDistanceInMeters: (...args: unknown[]) => mockCalculateDistance(...args),
  startLocationTracking: (...args: unknown[]) => mockStartTracking(...args),
  stopLocationTracking: (...args: unknown[]) => mockStopTracking(...args),
}));

jest.mock('@/services/chargingApiService', () => ({
  endChargingSession: (...args: unknown[]) => mockEndCharging(...args),
  cancelChargingSession: (...args: unknown[]) => mockCancelCharging(...args),
}));

import { ChargingProvider, useCharging } from '@/contexts/ChargingContext';

function ChargingProbe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useCharging>) => void;
}) {
  const api = useCharging();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return <Text testID="charging-probe">{api.isCharging ? 'on' : 'off'}</Text>;
}

describe('ChargingContext', () => {
  let locationCallback: LocationUpdateCb | null = null;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    locationCallback = null;
    mockCalculateDistance.mockReturnValue(10);
    mockStartTracking.mockImplementation(async (cb: LocationUpdateCb) => {
      locationCallback = cb;
      return mockUnsubscribe;
    });
    mockEndCharging.mockResolvedValue({ ok: true });
    mockCancelCharging.mockResolvedValue(undefined);
  });

  test('useCharging lanza fuera de ChargingProvider', () => {
    function Outside() {
      useCharging();
      return null;
    }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Outside />)).toThrow('useCharging debe usarse dentro de ChargingProvider');
    spy.mockRestore();
  });

  test('startChargingSession devuelve false si la distancia inicial supera 30 m', async () => {
    mockCalculateDistance.mockReturnValue(50);
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    let ok = false;
    await act(async () => {
      ok = await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
    });

    expect(ok).toBe(false);
    expect(api!.isCharging).toBe(false);
    expect(mockStartTracking).not.toHaveBeenCalled();
  });

  test('startChargingSession inicia sesión y tracking cuando está cerca', async () => {
    let api: ReturnType<typeof useCharging> | null = null;

    const { getByTestId } = render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    await act(async () => {
      const ok = await api!.startChargingSession(9, 41.1, 2.1, 41.1, 2.1);
      expect(ok).toBe(true);
    });

    expect(getByTestId('charging-probe').props.children).toBe('on');
    expect(api!.session?.stationId).toBe(9);
    expect(mockStartTracking).toHaveBeenCalled();
  });

  test('updateSessionId asigna id a la sesión activa', async () => {
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    await act(async () => {
      await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
      api!.updateSessionId(99);
    });

    expect(api!.session?.id).toBe(99);
  });

  test('stopChargingSession llama al API y apaga el estado', async () => {
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    await act(async () => {
      await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
      api!.updateSessionId(7);
    });

    let result: unknown;
    await act(async () => {
      result = await api!.stopChargingSession('manual');
    });

    expect(mockEndCharging).toHaveBeenCalledWith(7, 42, 0, 41.0, 2.0, 'manual');
    expect(mockStopTracking).toHaveBeenCalledWith(mockUnsubscribe);
    expect(api!.isCharging).toBe(false);
    expect(result).toMatchObject({ reason: 'manual', durationMinutes: 0 });
  });

  test('stopChargingSession no hace nada si no hay carga activa', async () => {
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    let result: unknown;
    await act(async () => {
      result = await api!.stopChargingSession('manual');
    });

    expect(result).toBeUndefined();
    expect(mockEndCharging).not.toHaveBeenCalled();
  });

  test('cancelChargingSession avisa al backend y limpia estado', async () => {
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    await act(async () => {
      await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
      api!.updateSessionId(5);
    });

    await act(async () => {
      await api!.cancelChargingSession();
    });

    expect(mockCancelCharging).toHaveBeenCalledWith(5, 'manual');
    expect(api!.isCharging).toBe(false);
    expect(api!.session).toBeNull();
  });

  test('alejarse más de 30 m dispara auto-stop con distance_exceeded', async () => {
    mockCalculateDistance.mockReturnValueOnce(10).mockReturnValue(35);
    mockEndCharging.mockResolvedValue({ points: 10 });

    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    await act(async () => {
      await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
      api!.updateSessionId(3);
    });

    await act(async () => {
      locationCallback?.({
        coords: { latitude: 42.0, longitude: 3.0 },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockEndCharging).toHaveBeenCalledWith(3, 42, 0, 41.0, 2.0, 'distance_exceeded');
    });

    await waitFor(() => {
      expect(api!.autoStopResult).toMatchObject({
        reason: 'distance_exceeded',
        apiResponse: { points: 10 },
      });
    });

    act(() => {
      api!.clearAutoStopResult();
    });
    expect(api!.autoStopResult).toBeNull();
  });

  test('el timer incrementa elapsedSeconds cada segundo', async () => {
    jest.useFakeTimers();
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    await act(async () => {
      await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(api!.elapsedSeconds).toBe(1);
    });

    jest.useRealTimers();
  });

  test('cancelChargingSession continúa si el API falla', async () => {
    mockCancelCharging.mockRejectedValue(new Error('network'));
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    await act(async () => {
      await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
      api!.updateSessionId(8);
      await api!.cancelChargingSession();
    });

    expect(api!.isCharging).toBe(false);
  });

  test('startChargingSession devuelve false si startLocationTracking lanza', async () => {
    mockStartTracking.mockRejectedValue(new Error('gps'));
    let api: ReturnType<typeof useCharging> | null = null;

    render(
      <ChargingProvider>
        <ChargingProbe onReady={(a) => { api = a; }} />
      </ChargingProvider>
    );

    await waitFor(() => expect(api).not.toBeNull());

    let ok = true;
    await act(async () => {
      ok = await api!.startChargingSession(1, 41.0, 2.0, 41.0, 2.0);
    });

    expect(ok).toBe(false);
  });
});
