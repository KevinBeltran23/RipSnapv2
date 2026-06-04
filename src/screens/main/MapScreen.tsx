import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  GoogleRipMap,
  MapControls,
  PinPlacementBanner,
} from '../../components/map';
import FilterSheet from '../../components/bottom-sheet/FilterSheet';
import { useAuth } from '../../contexts/AuthContext';
import { useRipMapLocation } from '../../hooks/useRipMapLocation';
import { useRipMapState } from '../../hooks/useRipMapState';
import {
  useCreateRipMapUploadMutation,
  useRipMapPointsQuery,
} from '../../services/store/ripMapQueries';
import type { RipMapPoint } from '../../types/ripMap';

function MapScreen() {
  const [isLayerPickerOpen, setIsLayerPickerOpen] = useState(false);
  const {
    data: pointsByLayer,
    isLoading,
    error,
    refetch,
  } = useRipMapPointsQuery();
  const createUploadMutation = useCreateRipMapUploadMutation();
  const { authUser } = useAuth();
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

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleLocate = useCallback(async () => {
    const coordinate = await getUserCoordinate();
    if (!coordinate) return;

    setUserLocation(coordinate);
    requestCameraFocus(coordinate);
  }, [getUserCoordinate, requestCameraFocus, setUserLocation]);

  const handleSelectPoint = useCallback(
    (point: RipMapPoint) => {
      setIsLayerPickerOpen(false);
      setSelectedPoint(point);
    },
    [setSelectedPoint],
  );

  const handleLayersPress = useCallback(() => {
    setIsLayerPickerOpen(current => !current);
  }, []);

  const handleCloseLayerPicker = useCallback(() => {
    setIsLayerPickerOpen(false);
  }, []);

  const handleMapPress = useCallback(
    (coordinate: { latitude: number; longitude: number }) => {
      if (isPinPlacementMode) {
        setIsLayerPickerOpen(false);
        placeDraftPin(coordinate);
        return;
      }
      clearSelection();
    },
    [clearSelection, isPinPlacementMode, placeDraftPin],
  );

  const handleStartAdd = useCallback(() => {
    setIsLayerPickerOpen(false);
    clearSelection();
  }, [clearSelection]);

  const handleStartPinPlacement = useCallback(() => {
    setIsLayerPickerOpen(false);
    startPinPlacement();
  }, [startPinPlacement]);

  const handleClosePopup = useCallback(() => {
    setIsLayerPickerOpen(false);
    clearSelection();
    clearDraftPin();
  }, [clearDraftPin, clearSelection]);

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
      <GoogleRipMap
        points={visiblePoints}
        selectedPointId={selectedPointId}
        userLocation={userLocation}
        draftPin={draftPin}
        cameraRequest={cameraRequest}
        onPointPress={handleSelectPoint}
        onMapPress={handleMapPress}
        onViewportChange={setViewport}
      />
      <MapControls
        onLocate={handleLocate}
        onReload={refetch}
        isLoading={isLoading}
        visibleLayerIds={visibleLayerIds}
        onToggleLayer={toggleLayer}
        isLayerPickerOpen={isLayerPickerOpen}
        onLayersPress={handleLayersPress}
        onCloseLayerPicker={handleCloseLayerPicker}
      />
      {isPinPlacementMode && <PinPlacementBanner onCancel={clearDraftPin} />}
      <FilterSheet
        selectedPoint={selectedPoint}
        visibleLayerIds={visibleLayerIds}
        visiblePoints={visiblePoints}
        draftCoordinate={draftPin}
        isPinPlacementMode={isPinPlacementMode}
        isLoading={isLoading}
        isSubmitting={createUploadMutation.isPending}
        isLayerPickerOpen={isLayerPickerOpen}
        error={error instanceof Error ? error.message : null}
        onSelectPoint={handleSelectPoint}
        onToggleLayer={toggleLayer}
        onStartAdd={handleStartAdd}
        onClosePopup={handleClosePopup}
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
