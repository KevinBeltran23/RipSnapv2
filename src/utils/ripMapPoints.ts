import type {
  RipCaptureType,
  RipCoordinate,
  RipMapLayerId,
  RipMapPoint,
  RipMapPointsByLayer,
} from '../types/ripMap';

type FirestoreTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
};

export interface RipCaptureMapRecord {
  id: string;
  userId?: string;
  sessionId?: string;
  captureType?: string;
  mediaUrl?: string;
  metadataUrl?: string;
  mediaStoragePath?: string;
  metaStoragePath?: string;
  notes?: string;
  title?: string;
  displayName?: string;
  layerId?: string;
  latitude?: number;
  longitude?: number;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  createdAt?: FirestoreTimestampLike | string | number | Date | null;
}

export const emptyRipMapPointsByLayer = (): RipMapPointsByLayer => ({
  public: [],
  admin: [],
  extra: [],
});

export const isRipMapLayerId = (value: string): value is RipMapLayerId =>
  value === 'public' || value === 'admin' || value === 'extra';

export const normalizeRipMapLayerId = (
  layerId: string | null | undefined,
): RipMapLayerId => {
  if (layerId && isRipMapLayerId(layerId)) return layerId;
  return 'public';
};

export const isValidRipCoordinate = (
  coordinate: Partial<RipCoordinate> | null | undefined,
): coordinate is RipCoordinate => {
  if (!coordinate) return false;
  const { latitude, longitude } = coordinate;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

export const formatCaptureTimestamp = (
  value: RipCaptureMapRecord['createdAt'],
): string | undefined => {
  if (!value) return undefined;

  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }

  return undefined;
};

const normalizeCaptureType = (captureType?: string): RipCaptureType => {
  if (captureType === 'photo' || captureType === 'video') return captureType;
  return 'unknown';
};

export const normalizeCaptureToRipMapPoint = (
  record: RipCaptureMapRecord,
  layerId: RipMapLayerId = normalizeRipMapLayerId(record.layerId),
): RipMapPoint | null => {
  const coordinate = {
    latitude: record.latitude ?? record.location?.latitude,
    longitude: record.longitude ?? record.location?.longitude,
  };

  if (!isValidRipCoordinate(coordinate)) return null;

  const captureType = normalizeCaptureType(record.captureType);
  const title =
    record.title?.trim() ||
    record.displayName?.trim() ||
    (captureType === 'unknown'
      ? 'Rip upload'
      : `${captureType[0].toUpperCase()}${captureType.slice(1)} upload`);

  return {
    id: `${layerId}:${record.id}`,
    layerId,
    sourceRecordId: record.id,
    coordinate,
    title,
    displayName: record.displayName?.trim() || undefined,
    notes: record.notes?.trim() || undefined,
    captureType,
    createdAt: formatCaptureTimestamp(record.createdAt),
    media: {
      url: record.mediaUrl,
      storagePath: record.mediaStoragePath,
      metadataUrl: record.metadataUrl,
      metadataPath: record.metaStoragePath,
      captureType,
    },
  };
};

export const groupRipMapPointsByLayer = (
  records: RipCaptureMapRecord[],
): RipMapPointsByLayer => {
  const pointsByLayer = emptyRipMapPointsByLayer();

  records.forEach(record => {
    const point = normalizeCaptureToRipMapPoint(record);
    if (point) pointsByLayer[point.layerId].push(point);
  });

  return pointsByLayer;
};
