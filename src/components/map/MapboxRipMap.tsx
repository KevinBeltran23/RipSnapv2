import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox, {
  ShapeSource,
  type Camera as MapboxCameraRef,
} from '@rnmapbox/maps';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type { RipMapRendererProps } from './RipMapRenderer.types';
import {
  coordinateToPosition,
  createClusterCircleStyle,
  createClusterLabelStyle,
  createRipMapPointFeatureCollection,
  createSelectedUploadCircleStyle,
  createUploadCircleStyle,
  initialMapboxCenter,
  initialMapboxZoom,
  isMapboxClusterFeature,
  MAPBOX_CLUSTER_FILTER,
  MAPBOX_RIP_LAYER_IDS,
  MAPBOX_RIP_SOURCE_ID,
  MAPBOX_SELECTED_POINT_FILTER,
  MAPBOX_UNSELECTED_POINT_FILTER,
  positionToCoordinate,
  zoomFromLongitudeDelta,
} from './mapbox/mapboxRipMapUtils';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN).catch(() => undefined);
}

const DEFAULT_MAPBOX_CLUSTERING = {
  enabled: true,
  radius: 48,
  maxZoom: 14,
};

function MapboxRipMap({
  points,
  selectedPointId,
  userLocation,
  draftPin,
  cameraRequest,
  clustering = DEFAULT_MAPBOX_CLUSTERING,
  onPointPress,
  onMapPress,
  onViewportChange,
}: RipMapRendererProps) {
  const colors = useColors();
  const { scaleFont } = useResponsiveStyles();
  const cameraRef = useRef<MapboxCameraRef>(null);
  const shapeSourceRef = useRef<ShapeSource>(null);
  const lastCameraRequestId = useRef<number | null>(null);
  const ignoreNextMapPressRef = useRef(false);

  const pointById = useMemo(
    () => new Map(points.map(point => [point.id, point])),
    [points],
  );

  const pointShape = useMemo(
    () =>
      createRipMapPointFeatureCollection(
        points,
        selectedPointId,
        colors.accent,
      ),
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
    () => createUploadCircleStyle(colors.background),
    [colors.background],
  );

  const selectedUploadCircleStyle = useMemo(
    () => createSelectedUploadCircleStyle(colors.accent, colors.background),
    [colors.accent, colors.background],
  );

  const clusterCircleStyle = useMemo(
    () => createClusterCircleStyle(colors.primary, colors.background),
    [colors.background, colors.primary],
  );

  const clusterLabelStyle = useMemo(
    () => createClusterLabelStyle(colors.background),
    [colors.background],
  );

  const resetIgnoredMapPress = () => {
    setTimeout(() => {
      ignoreNextMapPressRef.current = false;
    }, 0);
  };

  const handleClusterPress = useCallback(async (feature: GeoJSON.Feature) => {
    if (feature.geometry.type !== 'Point') return;

    ignoreNextMapPressRef.current = true;
    const centerCoordinate = feature.geometry.coordinates;

    try {
      const expansionZoom =
        await shapeSourceRef.current?.getClusterExpansionZoom(feature);
      cameraRef.current?.setCamera({
        centerCoordinate,
        zoomLevel: Math.min(expansionZoom ?? 16, 20),
        animationDuration: 500,
        animationMode: 'easeTo',
      });
    } catch {
      cameraRef.current?.setCamera({
        centerCoordinate,
        zoomLevel: 16,
        animationDuration: 500,
        animationMode: 'easeTo',
      });
    } finally {
      resetIgnoredMapPress();
    }
  }, []);

  const handlePointShapePress = (event: { features: GeoJSON.Feature[] }) => {
    const clusterFeature = event.features.find(isMapboxClusterFeature);
    if (clusterFeature) {
      handleClusterPress(clusterFeature);
      return;
    }

    const feature = event.features.find(
      pressedFeature => typeof pressedFeature.properties?.pointId === 'string',
    );
    const pointId = feature?.properties?.pointId;
    const point = typeof pointId === 'string' ? pointById.get(pointId) : null;

    if (!point) return;

    ignoreNextMapPressRef.current = true;
    onPointPress(point);
    resetIgnoredMapPress();
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
          centerCoordinate: initialMapboxCenter(),
          zoomLevel: initialMapboxZoom(),
        }}
      />

      <ShapeSource
        ref={shapeSourceRef}
        id={MAPBOX_RIP_SOURCE_ID}
        shape={pointShape}
        cluster={clustering.enabled}
        clusterRadius={clustering.radius}
        clusterMaxZoomLevel={clustering.maxZoom}
        hitbox={{ width: 44, height: 44 }}
        onPress={handlePointShapePress}
      >
        <Mapbox.CircleLayer
          id={MAPBOX_RIP_LAYER_IDS.clusters}
          filter={MAPBOX_CLUSTER_FILTER}
          style={clusterCircleStyle}
        />
        <Mapbox.SymbolLayer
          id={MAPBOX_RIP_LAYER_IDS.clusterLabels}
          filter={MAPBOX_CLUSTER_FILTER}
          style={clusterLabelStyle}
        />
        <Mapbox.CircleLayer
          id={MAPBOX_RIP_LAYER_IDS.unclusteredPoints}
          filter={MAPBOX_UNSELECTED_POINT_FILTER}
          style={uploadCircleStyle}
        />
        <Mapbox.CircleLayer
          id={MAPBOX_RIP_LAYER_IDS.selectedPoint}
          filter={MAPBOX_SELECTED_POINT_FILTER}
          style={selectedUploadCircleStyle}
        />
      </ShapeSource>

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
