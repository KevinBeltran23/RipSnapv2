export interface RipCoordinate {
  latitude: number;
  longitude: number;
}

export type RipMapLayerId = 'ripUploads';

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

export interface RipMapPointsByLayer {
  ripUploads: RipMapPoint[];
}

export interface RipMapUploadDraft {
  title: string;
  notes: string;
  coordinate: RipCoordinate | null;
}
