import React from 'react';
import { View, Text, Platform } from 'react-native';

export const MapView = ({ children, ...props }: any) => {
  if (Platform.OS !== 'web') {
    const RNMapView = require('react-native-maps').default;
    return <RNMapView {...props}>{children}</RNMapView>;
  }
  return null;
};

export const Marker = (props: any) => {
  if (Platform.OS !== 'web') {
    const { Marker: RNMarker } = require('react-native-maps');
    return <RNMarker {...props} />;
  }
  return null;
};
