import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox, {
  ShapeSource,
  type Camera as MapboxCameraRef,
} from '@rnmapbox/maps';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RIP_MAP_LAYER_BY_ID } from '../../config/mapLayers';
import type { RipMapRendererProps } from './RipMapRenderer.types';
import type { RipMapLayerId, RipMapStylePreset } from '../../types/ripMap';
import {
  coordinateToPosition,
  createMapboxClusterSelectionId,
  createClusterCircleStyle,
  createClusterLabelStyle,
  createPointLabelStyle,
  createRipMapPointFeatureCollection,
  createSelectedUploadCircleStyle,
  createUploadCircleStyle,
  getMapboxClusterPointCount,
  getRipMapPointIdsFromMapboxFeatureCollection,
  initialMapboxCenter,
  initialMapboxZoom,
  isMapboxClusterFeature,
  MAPBOX_CLUSTER_FILTER,
  MAPBOX_CLUSTER_PROPERTIES,
  MAPBOX_RIP_LAYER_IDS,
  MAPBOX_RIP_SOURCE_ID,
  MAPBOX_SELECTED_POINT_FILTER,
  MAPBOX_UNCLUSTERED_FILTER,
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

const MAPBOX_STYLE_URL_BY_PRESET: Record<RipMapStylePreset, string> = {
  light: Mapbox.StyleURL.Light,
  outdoors: Mapbox.StyleURL.Outdoors,
  satelliteStreet: Mapbox.StyleURL.SatelliteStreet,
};

const MAPBOX_STYLE_URL_OVERRIDES: Record<RipMapLayerId, string | undefined> = {
  public: process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_STYLE_URL,
  admin: process.env.EXPO_PUBLIC_MAPBOX_ADMIN_STYLE_URL,
  extra: process.env.EXPO_PUBLIC_MAPBOX_EXTRA_STYLE_URL,
};

const getLayerStyleUrl = (layerId: RipMapLayerId) => {
  const layer = RIP_MAP_LAYER_BY_ID[layerId];
  return (
    MAPBOX_STYLE_URL_OVERRIDES[layerId] ??
    MAPBOX_STYLE_URL_BY_PRESET[layer.stylePreset]
  );
};

function MapboxRipMap({
  points,
  activeLayerId,
  selectedPointId,
  userLocation,
  draftPin,
  cameraRequest,
  clustering = DEFAULT_MAPBOX_CLUSTERING,
  onPointPress,
  onClusterPress,
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
    () => createRipMapPointFeatureCollection(points, selectedPointId),
    [points, selectedPointId],
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
    () => createSelectedUploadCircleStyle(colors.accent),
    [colors.accent],
  );

  const clusterCircleStyle = useMemo(
    () =>
      createClusterCircleStyle(colors.background, colors.gray700, {
        public: RIP_MAP_LAYER_BY_ID.public.color,
        admin: RIP_MAP_LAYER_BY_ID.admin.color,
        extra: RIP_MAP_LAYER_BY_ID.extra.color,
      }),
    [colors.background, colors.gray700],
  );

  const clusterLabelStyle = useMemo(
    () =>
      createClusterLabelStyle(colors.textInverse, {
        public: RIP_MAP_LAYER_BY_ID.public.markerTextColor,
        admin: RIP_MAP_LAYER_BY_ID.admin.markerTextColor,
        extra: RIP_MAP_LAYER_BY_ID.extra.markerTextColor,
      }),
    [colors.textInverse],
  );

  const pointLabelStyle = useMemo(() => createPointLabelStyle(), []);

  const resetIgnoredMapPress = () => {
    setTimeout(() => {
      ignoreNextMapPressRef.current = false;
    }, 0);
  };

  const handleClusterPress = useCallback(
    async (feature: GeoJSON.Feature) => {
      if (feature.geometry.type !== 'Point') return;

      ignoreNextMapPressRef.current = true;
      const centerCoordinate = feature.geometry.coordinates;
      const pointCount = getMapboxClusterPointCount(feature);

      try {
        const [leavesResult, expansionZoomResult] = await Promise.allSettled([
          onClusterPress && pointCount > 0
            ? shapeSourceRef.current?.getClusterLeaves(feature, pointCount, 0)
            : Promise.resolve(null),
          shapeSourceRef.current?.getClusterExpansionZoom(feature),
        ]);

        if (onClusterPress && leavesResult.status === 'fulfilled') {
          const clusterPoints = getRipMapPointIdsFromMapboxFeatureCollection(
            leavesResult.value,
          )
            .map(pointId => pointById.get(pointId))
            .filter((point): point is NonNullable<typeof point> =>
              Boolean(point),
            );

          if (clusterPoints.length > 0) {
            onClusterPress({
              id: createMapboxClusterSelectionId(centerCoordinate, pointCount),
              coordinate: positionToCoordinate(centerCoordinate),
              pointCount: pointCount || clusterPoints.length,
              points: clusterPoints,
            });
          }
        }

        const expansionZoom =
          expansionZoomResult.status === 'fulfilled'
            ? expansionZoomResult.value
            : 16;

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
    },
    [onClusterPress, pointById],
  );

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
      styleURL={getLayerStyleUrl(activeLayerId)}
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
        clusterProperties={MAPBOX_CLUSTER_PROPERTIES}
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
        <Mapbox.SymbolLayer
          id={MAPBOX_RIP_LAYER_IDS.pointLabels}
          filter={MAPBOX_UNCLUSTERED_FILTER}
          style={pointLabelStyle}
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
