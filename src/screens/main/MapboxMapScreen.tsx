import React from 'react';
import { MapboxRipMap } from '../../components/map';
import MapScreen from './MapScreen';

function MapboxMapScreen() {
  return <MapScreen MapRenderer={MapboxRipMap} />;
}

export default MapboxMapScreen;
