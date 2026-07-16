export interface RipCoordinate {
  latitude: number;
  longitude: number;
}

export type RipMapLayerId = 'public' | 'admin' | 'extra';

export type RipCaptureType = 'photo' | 'video' | 'unknown';

export interface RipMediaReference {
  url?: string;
  storagePath?: string;
  metadataUrl?: string;
  metadataPath?: string;
  captureType: RipCaptureType;
}

export interface RipMapPoint {
  id: string;
  layerId: RipMapLayerId;
  sourceRecordId: string;
  coordinate: RipCoordinate;
  title: string;
  displayName?: string;
  notes?: string;
  captureType: RipCaptureType;
  createdAt?: string;
  media?: RipMediaReference;
}

export interface RipMapLayer {
  id: RipMapLayerId;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export interface RipMapViewport {
  center: RipCoordinate;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface RipMapCameraRequest {
  id: number;
  coordinate: RipCoordinate;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface RipMapClusteringConfig {
  enabled: boolean;
  radius: number;
  maxZoom: number;
}

export interface RipMapClusterSelection {
  id: string;
  coordinate: RipCoordinate;
  pointCount: number;
  points: RipMapPoint[];
}

export interface RipMapPointsByLayer {
  public: RipMapPoint[];
  admin: RipMapPoint[];
  extra: RipMapPoint[];
}

export interface RipMapUploadDraft {
  title: string;
  notes: string;
  coordinate: RipCoordinate | null;
}
