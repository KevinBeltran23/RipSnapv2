import { INITIAL_REGION } from '../../../config/constants';
import { RIP_MAP_LAYER_BY_ID } from '../../../config/mapLayers';
import type {
  RipCoordinate,
  RipMapLayerId,
  RipMapPoint,
} from '../../../types/ripMap';
import type { CircleLayerStyle, SymbolLayerStyle } from '@rnmapbox/maps';

export type MapboxPosition = [number, number];

export interface RipMapFeatureProperties {
  pointId: string;
  layerId: RipMapLayerId;
  color: string;
  markerGlyph: string;
  markerTextColor: string;
  publicCount: number;
  adminCount: number;
  extraCount: number;
  isSelected: boolean;
  title: string;
}

export const MAPBOX_RIP_SOURCE_ID = 'rip-upload-points-source';
export const MAPBOX_RIP_LAYER_IDS = {
  clusters: 'rip-upload-clusters',
  clusterLabels: 'rip-upload-cluster-labels',
  unclusteredPoints: 'rip-upload-unclustered-points',
  selectedPoint: 'rip-upload-selected-point',
  pointLabels: 'rip-upload-point-labels',
} as const;

export const MAPBOX_CLUSTER_PROPERTIES = {
  publicCount: [
    ['+', ['accumulated'], ['get', 'publicCount']],
    ['case', ['==', ['get', 'layerId'], 'public'], 1, 0],
  ],
  adminCount: [
    ['+', ['accumulated'], ['get', 'adminCount']],
    ['case', ['==', ['get', 'layerId'], 'admin'], 1, 0],
  ],
  extraCount: [
    ['+', ['accumulated'], ['get', 'extraCount']],
    ['case', ['==', ['get', 'layerId'], 'extra'], 1, 0],
  ],
} as any;

export const MAPBOX_CLUSTER_FILTER = ['has', 'point_count'] as any;
export const MAPBOX_UNCLUSTERED_FILTER = ['!', ['has', 'point_count']] as any;
export const MAPBOX_SELECTED_POINT_FILTER = [
  'all',
  MAPBOX_UNCLUSTERED_FILTER,
  ['==', ['get', 'isSelected'], true],
] as any;
export const MAPBOX_UNSELECTED_POINT_FILTER = [
  'all',
  MAPBOX_UNCLUSTERED_FILTER,
  ['!=', ['get', 'isSelected'], true],
] as any;

export const coordinateToPosition = ({
  latitude,
  longitude,
}: RipCoordinate): MapboxPosition => [longitude, latitude];

export const positionToCoordinate = ([
  longitude,
  latitude,
]: number[]): RipCoordinate => ({
  latitude,
  longitude,
});

export const initialMapboxCenter = (): MapboxPosition =>
  coordinateToPosition({
    latitude: INITIAL_REGION.latitude,
    longitude: INITIAL_REGION.longitude,
  });

export const zoomFromLongitudeDelta = (longitudeDelta?: number) => {
  if (!longitudeDelta || longitudeDelta <= 0) return 13;
  return Math.max(1, Math.min(20, Math.log2(360 / longitudeDelta)));
};

export const initialMapboxZoom = () =>
  zoomFromLongitudeDelta(INITIAL_REGION.longitudeDelta);

export const createRipMapPointFeatureCollection = (
  points: RipMapPoint[],
  selectedPointId: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Point, RipMapFeatureProperties> => ({
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
        color: layer.color,
        markerGlyph: layer.markerGlyph,
        markerTextColor: layer.markerTextColor,
        publicCount: point.layerId === 'public' ? 1 : 0,
        adminCount: point.layerId === 'admin' ? 1 : 0,
        extraCount: point.layerId === 'extra' ? 1 : 0,
        isSelected: point.id === selectedPointId,
        title: point.title,
      },
    };
  }),
});

export const createUploadCircleStyle = (
  backgroundColor: string,
): CircleLayerStyle => ({
  circleColor: ['get', 'color'] as any,
  circleOpacity: 0.96,
  circleRadius: 7,
  circleStrokeColor: backgroundColor,
  circleStrokeWidth: 2,
});

export const createSelectedUploadCircleStyle = (
  accentColor: string,
): CircleLayerStyle => ({
  circleColor: ['get', 'color'] as any,
  circleOpacity: 1,
  circleRadius: 11,
  circleStrokeColor: accentColor,
  circleStrokeWidth: 4,
});

export const createClusterCircleStyle = (
  backgroundColor: string,
  mixedColor: string,
  layerColors: Record<RipMapLayerId, string>,
): CircleLayerStyle => ({
  circleColor: [
    'case',
    [
      'all',
      ['>', ['get', 'publicCount'], 0],
      ['==', ['get', 'adminCount'], 0],
      ['==', ['get', 'extraCount'], 0],
    ],
    layerColors.public,
    [
      'all',
      ['==', ['get', 'publicCount'], 0],
      ['>', ['get', 'adminCount'], 0],
      ['==', ['get', 'extraCount'], 0],
    ],
    layerColors.admin,
    [
      'all',
      ['==', ['get', 'publicCount'], 0],
      ['==', ['get', 'adminCount'], 0],
      ['>', ['get', 'extraCount'], 0],
    ],
    layerColors.extra,
    mixedColor,
  ] as any,
  circleOpacity: 0.92,
  circleRadius: [
    'step',
    ['get', 'point_count'],
    18,
    10,
    22,
    30,
    27,
    75,
    32,
  ] as any,
  circleStrokeColor: backgroundColor,
  circleStrokeWidth: 3,
});

export const createClusterLabelStyle = (
  textColor: string,
  layerTextColors: Record<RipMapLayerId, string>,
): SymbolLayerStyle => ({
  textField: ['get', 'point_count_abbreviated'] as any,
  textSize: 13,
  textColor: [
    'case',
    [
      'all',
      ['>', ['get', 'publicCount'], 0],
      ['==', ['get', 'adminCount'], 0],
      ['==', ['get', 'extraCount'], 0],
    ],
    layerTextColors.public,
    [
      'all',
      ['==', ['get', 'publicCount'], 0],
      ['>', ['get', 'adminCount'], 0],
      ['==', ['get', 'extraCount'], 0],
    ],
    layerTextColors.admin,
    [
      'all',
      ['==', ['get', 'publicCount'], 0],
      ['==', ['get', 'adminCount'], 0],
      ['>', ['get', 'extraCount'], 0],
    ],
    layerTextColors.extra,
    textColor,
  ] as any,
  textAllowOverlap: true,
  textIgnorePlacement: true,
});

export const createPointLabelStyle = (): SymbolLayerStyle => ({
  textField: ['get', 'markerGlyph'] as any,
  textSize: ['case', ['get', 'isSelected'], 10, 9] as any,
  textColor: ['get', 'markerTextColor'] as any,
  textAllowOverlap: true,
  textIgnorePlacement: true,
});

export const isMapboxClusterFeature = (feature?: GeoJSON.Feature | null) =>
  Boolean(feature?.properties && 'point_count' in feature.properties);

export const getMapboxClusterPointCount = (feature: GeoJSON.Feature) => {
  const pointCount = feature.properties?.point_count;
  if (typeof pointCount === 'number') return pointCount;
  if (typeof pointCount === 'string') {
    const parsedPointCount = Number(pointCount);
    return Number.isFinite(parsedPointCount) ? parsedPointCount : 0;
  }
  return 0;
};

export const createMapboxClusterSelectionId = (
  coordinates: number[],
  pointCount: number,
) => `cluster:${coordinates[0] ?? 0}:${coordinates[1] ?? 0}:${pointCount}`;

export const getRipMapPointIdsFromMapboxFeatureCollection = (
  featureCollection: unknown,
) => {
  const features = (featureCollection as GeoJSON.FeatureCollection | null)
    ?.features;
  if (!Array.isArray(features)) return [];

  return features
    .map(feature => feature.properties?.pointId)
    .filter((pointId): pointId is string => typeof pointId === 'string');
};
