import type {
  RipCoordinate,
  RipMapCameraRequest,
  RipMapPoint,
  RipMapViewport,
} from '../../types/ripMap';

export interface RipMapRendererProps {
  points: RipMapPoint[];
  selectedPointId: string | null;
  userLocation: RipCoordinate | null;
  draftPin: RipCoordinate | null;
  cameraRequest: RipMapCameraRequest | null;
  onPointPress: (point: RipMapPoint) => void;
  onMapPress: (coordinate: RipCoordinate) => void;
  onViewportChange: (viewport: RipMapViewport) => void;
}
