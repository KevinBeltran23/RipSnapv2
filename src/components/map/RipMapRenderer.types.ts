import type {
  RipCoordinate,
  RipMapCameraRequest,
  RipMapClusterSelection,
  RipMapClusteringConfig,
  RipMapPoint,
  RipMapViewport,
} from '../../types/ripMap';

export interface RipMapRendererProps {
  points: RipMapPoint[];
  selectedPointId: string | null;
  userLocation: RipCoordinate | null;
  draftPin: RipCoordinate | null;
  cameraRequest: RipMapCameraRequest | null;
  clustering?: RipMapClusteringConfig;
  onPointPress: (point: RipMapPoint) => void;
  onClusterPress?: (cluster: RipMapClusterSelection) => void;
  onMapPress: (coordinate: RipCoordinate) => void;
  onViewportChange: (viewport: RipMapViewport) => void;
}
