import type {
  RipCoordinate,
  RipMapCameraRequest,
  RipMapClusterSelection,
  RipMapClusteringConfig,
  RipMapLayerId,
  RipMapPoint,
  RipMapViewport,
} from '../../types/ripMap';

export interface RipMapRendererProps {
  points: RipMapPoint[];
  activeLayerId: RipMapLayerId;
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
