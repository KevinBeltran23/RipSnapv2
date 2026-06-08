import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { INITIAL_REGION } from '../../config/constants';
import { RIP_MAP_LAYER_BY_ID } from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import type { RipMapViewport } from '../../types/ripMap';
import type { RipMapRendererProps } from './RipMapRenderer.types';

const regionToViewport = (region: Region): RipMapViewport => ({
  center: {
    latitude: region.latitude,
    longitude: region.longitude,
  },
  latitudeDelta: region.latitudeDelta,
  longitudeDelta: region.longitudeDelta,
});

function GoogleRipMap({
  points,
  selectedPointId,
  userLocation,
  draftPin,
  cameraRequest,
  onPointPress,
  onMapPress,
  onViewportChange,
}: RipMapRendererProps) {
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const lastCameraRequestId = useRef<number | null>(null);

  useEffect(() => {
    if (!cameraRequest || cameraRequest.id === lastCameraRequestId.current) {
      return;
    }

    lastCameraRequestId.current = cameraRequest.id;
    mapRef.current?.animateToRegion(
      {
        ...cameraRequest.coordinate,
        latitudeDelta: cameraRequest.latitudeDelta ?? 0.015,
        longitudeDelta: cameraRequest.longitudeDelta ?? 0.015,
      },
      700,
    );
  }, [cameraRequest]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={INITIAL_REGION}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      onPress={event => onMapPress(event.nativeEvent.coordinate)}
      onRegionChangeComplete={region =>
        onViewportChange(regionToViewport(region))
      }
    >
      {points.map(point => {
        const layer = RIP_MAP_LAYER_BY_ID[point.layerId];
        const isSelected = point.id === selectedPointId;

        return (
          <Marker
            key={point.id}
            coordinate={point.coordinate}
            pinColor={isSelected ? colors.accent : layer.color}
            onPress={() => onPointPress(point)}
          />
        );
      })}

      {userLocation && (
        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={[
              styles.userDot,
              {
                backgroundColor: colors.primary,
                borderColor: colors.background,
              },
            ]}
          />
        </Marker>
      )}
      {draftPin && <Marker coordinate={draftPin} pinColor={colors.accent} />}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
});

export default GoogleRipMap;
