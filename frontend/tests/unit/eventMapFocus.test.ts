import { describe, expect, test } from '@jest/globals';

import {
  buildClearEventLocationPatch,
  buildEventFocusMapPatch,
  getFitCoordinatesForEventFocus,
  resolveNavigationOrigin,
} from '@/utils/eventMapFocus';

describe('buildEventFocusMapPatch', () => {
  test('fija origen en la estación y destino en el evento con el título', () => {
    const patch = buildEventFocusMapPatch(41.4, 2.18, 'Concierto', 41.387, 2.168);
    expect(patch.routeOriginPreset).toEqual({ latitude: 41.387, longitude: 2.168 });
    expect(patch.selectedLocation).toEqual({ latitude: 41.4, longitude: 2.18 });
    expect(patch.selectedLocationLabel).toBe('Concierto');
  });
});

describe('getFitCoordinatesForEventFocus', () => {
  test('devuelve estación y evento en ese orden', () => {
    expect(getFitCoordinatesForEventFocus(1, 2, 3, 4)).toEqual([
      { latitude: 1, longitude: 2 },
      { latitude: 3, longitude: 4 },
    ]);
  });
});

describe('resolveNavigationOrigin', () => {
  test('con preset usa la estación como origen sin prompt', () => {
    const origin = { latitude: 41.39, longitude: 2.17 };
    expect(resolveNavigationOrigin(origin)).toEqual({ type: 'preset', origin });
  });

  test('sin preset pide elegir origen al usuario', () => {
    expect(resolveNavigationOrigin(null)).toEqual({ type: 'prompt' });
  });
});

describe('buildClearEventLocationPatch', () => {
  test('anula ubicación, preset y etiqueta', () => {
    expect(buildClearEventLocationPatch()).toEqual({
      selectedLocation: null,
      routeOriginPreset: null,
      selectedLocationLabel: null,
    });
  });
});
