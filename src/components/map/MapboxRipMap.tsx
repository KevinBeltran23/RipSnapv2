import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox, { type Camera as MapboxCameraRef } from '@rnmapbox/maps';
import { INITIAL_REGION } from '../../config/constants';
import { RIP_MAP_LAYER_BY_ID } from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type { RipCoordinate, RipMapLayerId } from '../../types/ripMap';
import type { RipMapRendererProps } from './RipMapRenderer.types';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN).catch(() => undefined);
}

type MapboxPosition = [number, number];

interface RipMapFeatureProperties {
  pointId: string;
  layerId: RipMapLayerId;
  color: string;
  isSelected: boolean;
  title: string;
}

const coordinateToPosition = ({
  latitude,
  longitude,
}: RipCoordinate): MapboxPosition => [longitude, latitude];

const positionToCoordinate = ([
  longitude,
  latitude,
]: number[]): RipCoordinate => ({
  latitude,
  longitude,
});

const zoomFromLongitudeDelta = (longitudeDelta?: number) => {
  if (!longitudeDelta || longitudeDelta <= 0) return 13;
  return Math.max(1, Math.min(20, Math.log2(360 / longitudeDelta)));
};

function MapboxRipMap({
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
  const { scaleFont } = useResponsiveStyles();
  const cameraRef = useRef<MapboxCameraRef>(null);
  const lastCameraRequestId = useRef<number | null>(null);
  const ignoreNextMapPressRef = useRef(false);

  const pointById = useMemo(
    () => new Map(points.map(point => [point.id, point])),
    [points],
  );

  const pointShape = useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Point, RipMapFeatureProperties>
  >(
    () => ({
      type: 'FeatureCollection',
      features: points.map(point => {
        const layer = RIP_MAP_LAYER_BY_ID[point.layerId];

        return {
          type: 'Feature',
          id: point.id,
          geometry: {
            type: 'Point',
            coordinates: coordinateToPosition(point.coordinate),
          },
          properties: {
            pointId: point.id,
            layerId: point.layerId,
            color: point.id === selectedPointId ? colors.accent : layer.color,
            isSelected: point.id === selectedPointId,
            title: point.title,
          },
        };
      }),
    }),
    [colors.accent, points, selectedPointId],
  );

  useEffect(() => {
    if (!cameraRequest || cameraRequest.id === lastCameraRequestId.current) {
      return;
    }

    lastCameraRequestId.current = cameraRequest.id;
    cameraRef.current?.setCamera({
      centerCoordinate: coordinateToPosition(cameraRequest.coordinate),
      zoomLevel: zoomFromLongitudeDelta(cameraRequest.longitudeDelta),
      animationDuration: 700,
      animationMode: 'easeTo',
    });
  }, [cameraRequest]);

  const uploadCircleStyle = useMemo(
    () => ({
      circleColor: ['get', 'color'] as any,
      circleOpacity: 0.96,
      circleRadius: [
        'case',
        ['boolean', ['get', 'isSelected'], false],
        10,
        7,
      ] as any,
      circleStrokeColor: colors.background,
      circleStrokeWidth: [
        'case',
        ['boolean', ['get', 'isSelected'], false],
        3,
        2,
      ] as any,
    }),
    [colors.background],
  );

  const handlePointShapePress = (event: { features: GeoJSON.Feature[] }) => {
    const feature = event.features.find(
      pressedFeature => typeof pressedFeature.properties?.pointId === 'string',
    );
    const pointId = feature?.properties?.pointId;
    const point = typeof pointId === 'string' ? pointById.get(pointId) : null;

    if (!point) return;

    ignoreNextMapPressRef.current = true;
    onPointPress(point);
    setTimeout(() => {
      ignoreNextMapPressRef.current = false;
    }, 0);
  };

  const handleMapPress = (feature: GeoJSON.Feature<GeoJSON.Point>) => {
    if (ignoreNextMapPressRef.current) {
      ignoreNextMapPressRef.current = false;
      return;
    }

    onMapPress(positionToCoordinate(feature.geometry.coordinates));
  };

  const handleMapIdle = (state: Mapbox.MapState) => {
    const { center, bounds } = state.properties;
    onViewportChange({
      center: positionToCoordinate(center),
      latitudeDelta: Math.abs(bounds.ne[1] - bounds.sw[1]),
      longitudeDelta: Math.abs(bounds.ne[0] - bounds.sw[0]),
    });
  };

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.map, styles.missingTokenContainer]}>
        <Text style={[styles.missingTokenTitle, { color: colors.textPrimary }]}>
          Mapbox token required
        </Text>
        <Text
          style={[
            styles.missingTokenBody,
            { color: colors.textSecondary, fontSize: scaleFont(14) },
          ]}
        >
          Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN and rebuild the dev client.
        </Text>
      </View>
    );
  }

  return (
    <Mapbox.MapView
      style={styles.map}
      styleURL={Mapbox.StyleURL.Outdoors}
      compassEnabled={false}
      logoEnabled
      attributionEnabled
      onPress={handleMapPress}
      onMapIdle={handleMapIdle}
    >
      <Mapbox.Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: coordinateToPosition({
            latitude: INITIAL_REGION.latitude,
            longitude: INITIAL_REGION.longitude,
          }),
          zoomLevel: zoomFromLongitudeDelta(INITIAL_REGION.longitudeDelta),
        }}
      />

      <Mapbox.ShapeSource
        id="rip-upload-points-source"
        shape={pointShape}
        hitbox={{ width: 44, height: 44 }}
        onPress={handlePointShapePress}
      >
        <Mapbox.CircleLayer
          id="rip-upload-points-circles"
          style={uploadCircleStyle}
        />
      </Mapbox.ShapeSource>

      {userLocation && (
        <Mapbox.MarkerView
          coordinate={coordinateToPosition(userLocation)}
          anchor={{ x: 0.5, y: 0.5 }}
          allowOverlap
        >
          <View
            style={[
              styles.userDot,
              {
                backgroundColor: colors.primary,
                borderColor: colors.background,
              },
            ]}
          />
        </Mapbox.MarkerView>
      )}

      {draftPin && (
        <Mapbox.MarkerView
          coordinate={coordinateToPosition(draftPin)}
          anchor={{ x: 0.5, y: 1 }}
          allowOverlap
        >
          <View
            style={[
              styles.draftPin,
              {
                backgroundColor: colors.accent,
                borderColor: colors.background,
              },
            ]}
          />
        </Mapbox.MarkerView>
      )}
    </Mapbox.MapView>
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
  draftPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  missingTokenContainer: {
    alignItems: 'center',
    backgroundColor: '#F7FAFA',
    justifyContent: 'center',
    padding: 24,
  },
  missingTokenTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  missingTokenBody: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MapboxRipMap;
