import React from 'react';
import { MapboxRipMap } from '../../components/map';
import type { RipMapClusteringConfig } from '../../types/ripMap';
import MapScreen from './MapScreen';

const MAPBOX_VALIDATION_CLUSTERING: RipMapClusteringConfig = {
  enabled: true,
  radius: 48,
  maxZoom: 14,
};

function MapboxMapScreen() {
  return (
    <MapScreen
      MapRenderer={MapboxRipMap}
      clustering={MAPBOX_VALIDATION_CLUSTERING}
    />
  );
}

export default MapboxMapScreen;
