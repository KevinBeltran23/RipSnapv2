import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MapControls, PinPlacementBanner } from '../../components/map';
import FilterSheet from '../../components/bottom-sheet/FilterSheet';
import { useAuth } from '../../contexts/AuthContext';
import { useRecentlyViewedRipMapPoints } from '../../hooks/useRecentlyViewedRipMapPoints';
import { useRipMapLocation } from '../../hooks/useRipMapLocation';
import { useRipMapState } from '../../hooks/useRipMapState';
import {
  useCreateRipMapUploadMutation,
  useRipMapPointsQuery,
} from '../../services/store/ripMapQueries';
import type { RipMapClusterSelection, RipMapPoint } from '../../types/ripMap';
import type { RipMapRendererProps } from '../../components/map/RipMapRenderer.types';
import type { RipMapClusteringConfig } from '../../types/ripMap';

interface MapScreenProps {
  MapRenderer: React.ComponentType<RipMapRendererProps>;
  clustering?: RipMapClusteringConfig;
}

function MapScreen({ MapRenderer, clustering }: MapScreenProps) {
  const [isLayerPickerOpen, setIsLayerPickerOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] =
    useState<RipMapClusterSelection | null>(null);
  const { authUser } = useAuth();
  const {
    data: pointsByLayer,
    isLoading,
    error,
    refetch,
  } = useRipMapPointsQuery({ enabled: Boolean(authUser) });
  const createUploadMutation = useCreateRipMapUploadMutation();
  const {
    setViewport,
    visibleLayerIds,
    toggleLayer,
    selectedPoint,
    selectedPointId,
    selectPoint: setSelectedPoint,
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
  } = useRipMapState(pointsByLayer);
  const { getUserCoordinate } = useRipMapLocation();
  const { recentlyViewedPoints, recordViewedPoint } =
    useRecentlyViewedRipMapPoints(authUser?.uid, visiblePoints);

  useFocusEffect(
    useCallback(() => {
      if (authUser) {
        refetch();
      }
    }, [authUser, refetch]),
  );

  useEffect(() => {
    setSelectedCluster(null);
  }, [visiblePoints]);

  const handleReload = useCallback(() => {
    if (authUser) {
      refetch();
    }
  }, [authUser, refetch]);

  const handleLocate = useCallback(async () => {
    const coordinate = await getUserCoordinate();
    if (!coordinate) return;

    setUserLocation(coordinate);
    requestCameraFocus(coordinate);
  }, [getUserCoordinate, requestCameraFocus, setUserLocation]);

  const handleSelectPoint = useCallback(
    (point: RipMapPoint) => {
      setIsLayerPickerOpen(false);
      setSelectedCluster(null);
      recordViewedPoint(point);
      setSelectedPoint(point);
    },
    [recordViewedPoint, setSelectedPoint],
  );

  const handleSelectCluster = useCallback(
    (cluster: RipMapClusterSelection) => {
      setIsLayerPickerOpen(false);
      clearSelection();
      setSelectedCluster(cluster);
    },
    [clearSelection],
  );

  const handleSelectClusterPoint = useCallback(
    (point: RipMapPoint) => {
      setIsLayerPickerOpen(false);
      recordViewedPoint(point);
      setSelectedPoint(point);
      requestCameraFocus(point.coordinate);
    },
    [recordViewedPoint, requestCameraFocus, setSelectedPoint],
  );

  const handleCloseCluster = useCallback(() => {
    setSelectedCluster(null);
  }, []);

  const handleLayersPress = useCallback(() => {
    setSelectedCluster(null);
    setIsLayerPickerOpen(current => !current);
  }, []);

  const handleCloseLayerPicker = useCallback(() => {
    setIsLayerPickerOpen(false);
  }, []);

  const handleMapPress = useCallback(
    (coordinate: { latitude: number; longitude: number }) => {
      if (isPinPlacementMode) {
        setIsLayerPickerOpen(false);
        setSelectedCluster(null);
        placeDraftPin(coordinate);
        return;
      }
      setSelectedCluster(null);
      clearSelection();
    },
    [clearSelection, isPinPlacementMode, placeDraftPin],
  );

  const handleStartAdd = useCallback(() => {
    setIsLayerPickerOpen(false);
    setSelectedCluster(null);
    clearSelection();
  }, [clearSelection]);

  const handleStartPinPlacement = useCallback(() => {
    setIsLayerPickerOpen(false);
    setSelectedCluster(null);
    startPinPlacement();
  }, [startPinPlacement]);

  const handleClosePopup = useCallback(() => {
    setIsLayerPickerOpen(false);
    if (selectedPoint && selectedCluster) {
      clearSelection();
      clearDraftPin();
      return;
    }

    setSelectedCluster(null);
    clearSelection();
    clearDraftPin();
  }, [clearDraftPin, clearSelection, selectedCluster, selectedPoint]);

  const handleSubmitUpload = useCallback(
    async ({ title, notes }: { title: string; notes: string }) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        Alert.alert('Missing Upload Name', 'Enter a name for this upload.');
        return false;
      }
      if (!draftPin) {
        Alert.alert('Missing Pin', 'Place a pin on the map before submitting.');
        return false;
      }
      if (!authUser) {
        Alert.alert('Not Signed In', 'Sign in before adding a map upload.');
        return false;
      }

      try {
        await createUploadMutation.mutateAsync({
          userId: authUser.uid,
          title: trimmedTitle,
          notes,
          coordinate: draftPin,
        });
        clearDraftPin();
        refetch();
        Alert.alert('Upload Saved', 'The map upload was saved successfully.');
        return true;
      } catch (submitError: any) {
        Alert.alert(
          'Upload Failed',
          submitError?.message ?? 'Could not save the map upload.',
        );
        return false;
      }
    },
    [authUser, clearDraftPin, createUploadMutation, draftPin, refetch],
  );

  return (
    <View style={styles.container}>
      <MapRenderer
        points={visiblePoints}
        selectedPointId={selectedPointId}
        userLocation={userLocation}
        draftPin={draftPin}
        cameraRequest={cameraRequest}
        clustering={clustering}
        onPointPress={handleSelectPoint}
        onClusterPress={handleSelectCluster}
        onMapPress={handleMapPress}
        onViewportChange={setViewport}
      />
      <MapControls
        onLocate={handleLocate}
        onReload={handleReload}
        isLoading={isLoading}
        onLayersPress={handleLayersPress}
      />
      {isPinPlacementMode && <PinPlacementBanner onCancel={clearDraftPin} />}
      <FilterSheet
        selectedPoint={selectedPoint}
        selectedCluster={selectedCluster}
        visibleLayerIds={visibleLayerIds}
        visiblePoints={visiblePoints}
        recentlyViewedPoints={recentlyViewedPoints}
        draftCoordinate={draftPin}
        isPinPlacementMode={isPinPlacementMode}
        isLoading={isLoading}
        isSubmitting={createUploadMutation.isPending}
        isLayerPickerOpen={isLayerPickerOpen}
        error={error instanceof Error ? error.message : null}
        onSelectPoint={handleSelectPoint}
        onSelectClusterPoint={handleSelectClusterPoint}
        onCloseCluster={handleCloseCluster}
        onToggleLayer={toggleLayer}
        onStartAdd={handleStartAdd}
        onClosePopup={handleClosePopup}
        onCloseLayerPicker={handleCloseLayerPicker}
        onStartPinPlacement={handleStartPinPlacement}
        onSubmitUpload={handleSubmitUpload}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MapScreen;
