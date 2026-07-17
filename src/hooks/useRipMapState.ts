import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_VISIBLE_RIP_LAYER_IDS } from '../config/mapLayers';
import type {
  RipCoordinate,
  RipMapCameraRequest,
  RipMapLayerId,
  RipMapPoint,
  RipMapPointsByLayer,
  RipMapViewport,
} from '../types/ripMap';
import { emptyRipMapPointsByLayer } from '../utils/ripMapPoints';

const EMPTY_POINTS_BY_LAYER = emptyRipMapPointsByLayer();

export function useRipMapState(pointsByLayer?: RipMapPointsByLayer) {
  const [visibleLayerIds, setVisibleLayerIds] = useState<RipMapLayerId[]>(
    DEFAULT_VISIBLE_RIP_LAYER_IDS,
  );
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<RipMapViewport | null>(null);
  const [userLocation, setUserLocation] = useState<RipCoordinate | null>(null);
  const [draftPin, setDraftPin] = useState<RipCoordinate | null>(null);
  const [isPinPlacementMode, setIsPinPlacementMode] = useState(false);
  const [cameraRequest, setCameraRequest] =
    useState<RipMapCameraRequest | null>(null);

  const safePointsByLayer = pointsByLayer ?? EMPTY_POINTS_BY_LAYER;

  const visiblePoints = useMemo(
    () => visibleLayerIds.flatMap(layerId => safePointsByLayer[layerId] ?? []),
    [safePointsByLayer, visibleLayerIds],
  );

  const selectedPoint = useMemo<RipMapPoint | null>(() => {
    if (!selectedPointId) return null;
    return visiblePoints.find(point => point.id === selectedPointId) ?? null;
  }, [selectedPointId, visiblePoints]);

  const toggleLayer = useCallback((layerId: RipMapLayerId) => {
    setVisibleLayerIds(current => {
      if (current.includes(layerId)) {
        return current.filter(id => id !== layerId);
      }
      return [...current, layerId];
    });
    setSelectedPointId(null);
  }, []);

  const selectPoint = useCallback((point: RipMapPoint) => {
    setSelectedPointId(point.id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPointId(null);
  }, []);

  const requestCameraFocus = useCallback(
    (
      coordinate: RipCoordinate,
      options?: { latitudeDelta?: number; longitudeDelta?: number },
    ) => {
      setCameraRequest(current => ({
        id: (current?.id ?? 0) + 1,
        coordinate,
        latitudeDelta: options?.latitudeDelta,
        longitudeDelta: options?.longitudeDelta,
      }));
    },
    [],
  );

  const startPinPlacement = useCallback(() => {
    setSelectedPointId(null);
    setIsPinPlacementMode(true);
  }, []);

  const placeDraftPin = useCallback((coordinate: RipCoordinate) => {
    setDraftPin(coordinate);
    setIsPinPlacementMode(false);
  }, []);

  const clearDraftPin = useCallback(() => {
    setDraftPin(null);
    setIsPinPlacementMode(false);
  }, []);

  return {
    viewport,
    setViewport,
    visibleLayerIds,
    toggleLayer,
    selectedPoint,
    selectedPointId,
    selectPoint,
    clearSelection,
    visiblePoints,
    userLocation,
    setUserLocation,
    draftPin,
    isPinPlacementMode,
    startPinPlacement,
    placeDraftPin,
    clearDraftPin,
    cameraRequest,
    requestCameraFocus,
  };
}
