import React from 'react';
import { GoogleRipMap } from '../../components/map';
import MapScreen from './MapScreen';

function GoogleMapScreen() {
  return <MapScreen MapRenderer={GoogleRipMap} />;
}

export default GoogleMapScreen;
