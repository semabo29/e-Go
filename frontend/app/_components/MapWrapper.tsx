import React, { forwardRef, useMemo } from 'react';
import MapViewCluster from 'react-native-map-clustering';
import { Marker, Callout } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';

import { getSemanticColors } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

export { Marker, Callout };

function formatClusterCount(points: number) {
  return String(points);
}

export const MapView = forwardRef((props: any, ref: any) => {
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);

  return (
    <View style={{ flex: 1 }}>
      <MapViewCluster
        key={colorblindFriendly ? 'accessible' : 'default'}
        ref={ref} 
        {...props}
        radius={50} 
        renderCluster={(cluster: any) => {
          const { id, geometry, onPress, properties } = cluster;
          const points = properties.point_count;
          const label = formatClusterCount(points);

          const size = points >= 100 ? 58 : points >= 30 ? 52 : 46;
          return (
            <Marker
              key={`cluster-${id}-${sem.accent}`}
              coordinate={{
                longitude: geometry.coordinates[0],
                latitude: geometry.coordinates[1],
              }}
              onPress={onPress}
            >
              <View
                style={[
                  styles.clusterContainer,
                  { backgroundColor: sem.accent, minWidth: size, minHeight: size },
                ]}
              >
                <Text style={styles.clusterText}>
                  {label}
                </Text>
              </View>
            </Marker>
          );
        }}
      >
        {/* Aquí va TODO: estaciones y tu coche */}
        {props.children}
      </MapViewCluster>
    </View>
  );
});

MapView.displayName = 'MapView';

export default function MapWrapper() {
  return null;
}

const styles = StyleSheet.create({
  clusterContainer: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 46,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  clusterText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12.5,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});