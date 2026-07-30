export interface Media {
  url: string;
  path: string;
  type: 'image' | 'pdf' | 'video';
  name: string;
}

export interface DetectionMetadataRecord {
  className: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface DetectionMetadataFrame {
  elapsedMs: number;
  detections?: DetectionMetadataRecord[];
}

export interface CaptureMetadata {
  sessionId?: string;
  captureType?: 'photo' | 'video';
  source?: string;
  coordinateSpace?: string;
  timestamp?: string;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  screenWidth?: number;
  screenHeight?: number;
  mediaWidth?: number;
  mediaHeight?: number;
  modelName?: string;
  modelInputSize?: number;
  layerId?: string;
  title?: string;
  notes?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  } | null;
  frames?: DetectionMetadataFrame[];
}
