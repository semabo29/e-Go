import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { getSemanticColors } from '@/constants/accessibilityColors';
import MapWrapperDefault, { MapView } from '@/app/_components/MapWrapper';

const mockUseColorblindPreference = jest.fn(() => ({
  colorblindFriendly: false,
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => mockUseColorblindPreference(),
}));

let mockLastRenderCluster: ((c: unknown) => React.ReactElement) | undefined;
let mockLastClusterMapProps: Record<string, unknown> = {};
let mockClusterMountCount = 0;

jest.mock('react-native-map-clustering', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapViewCluster = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    mockClusterMountCount += 1;
    mockLastRenderCluster = props.renderCluster as typeof mockLastRenderCluster;
    mockLastClusterMapProps = props;
    React.useImperativeHandle(ref, () => ({}));
    return <View testID="map-cluster-mock">{props.children}</View>;
  });
  MockMapViewCluster.displayName = 'MapViewCluster';

  return { __esModule: true, default: MockMapViewCluster };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Marker: ({ children }: { children?: React.ReactNode }) => (
      <View testID="cluster-marker">{children}</View>
    ),
    Callout: View,
  };
});

function makeCluster(pointCount: number) {
  return {
    id: 'cluster-1',
    geometry: { coordinates: [2.17, 41.38] },
    onPress: jest.fn(),
    properties: { point_count: pointCount },
  };
}

function clusterContainerStyle(pointCount: number): ViewStyle {
  if (!mockLastRenderCluster) {
    throw new Error('renderCluster no capturado');
  }
  const { getByText } = render(mockLastRenderCluster(makeCluster(pointCount)));
  let node: ReturnType<typeof getByText> | { parent?: unknown } = getByText(String(pointCount));
  while (node && 'parent' in node && node.parent) {
    node = node.parent as typeof node;
    const style = StyleSheet.flatten(
      (node as { props?: { style?: StyleProp<ViewStyle> } }).props?.style
    );
    if (style.minWidth != null) {
      return style;
    }
  }
  throw new Error('No se encontró el contenedor del cluster');
}

describe('MapWrapper (nativo)', () => {
  beforeEach(() => {
    mockUseColorblindPreference.mockReturnValue({ colorblindFriendly: false });
    mockLastRenderCluster = undefined;
    mockLastClusterMapProps = {};
    mockClusterMountCount = 0;
  });

  test('MapView pasa radius=50 y renderCluster al cluster', () => {
    render(<MapView testID="map-under-test" />);

    expect(mockLastClusterMapProps.radius).toBe(50);
    expect(typeof mockLastRenderCluster).toBe('function');
    expect(mockLastClusterMapProps.testID).toBe('map-under-test');
  });

  test('renderCluster: etiqueta con el recuento de puntos', () => {
    render(<MapView />);
    const { getByText } = render(mockLastRenderCluster!(makeCluster(42)));
    expect(getByText('42')).toBeTruthy();
  });

  test.each([
    [5, 46],
    [30, 52],
    [100, 58],
  ])('renderCluster: %i puntos → tamaño mínimo %i', (points, expectedSize) => {
    render(<MapView />);
    const style = clusterContainerStyle(points);
    expect(style.minWidth).toBe(expectedSize);
    expect(style.minHeight).toBe(expectedSize);
  });

  test('renderCluster usa el color de acento del tema por defecto', () => {
    render(<MapView />);
    const sem = getSemanticColors(false);
    const style = clusterContainerStyle(10);
    expect(style.backgroundColor).toBe(sem.accent);
  });

  test('modo daltónico: remonta el mapa y usa color de acento accesible', () => {
    const { rerender } = render(<MapView />);
    expect(mockClusterMountCount).toBe(1);

    mockUseColorblindPreference.mockReturnValue({ colorblindFriendly: true });
    rerender(<MapView />);
    expect(mockClusterMountCount).toBe(2);

    const sem = getSemanticColors(true);
    const style = clusterContainerStyle(10);
    expect(style.backgroundColor).toBe(sem.accent);
  });

  test('export default MapWrapper devuelve null', () => {
    expect(MapWrapperDefault()).toBeNull();
  });
});
