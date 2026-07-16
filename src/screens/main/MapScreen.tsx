import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { MapControls, PinPlacementBanner } from '../../components/map';
import FilterSheet from '../../components/bottom-sheet/FilterSheet';
import { useAuth } from '../../contexts/AuthContext';
import { useDetectionSettings } from '../../contexts/DetectionSettingsContext';
import { useRecentlyViewedRipMapPoints } from '../../hooks/useRecentlyViewedRipMapPoints';
import { useRipMapLocation } from '../../hooks/useRipMapLocation';
import { useRipMapState } from '../../hooks/useRipMapState';
import { useRipMapPointsQuery } from '../../services/store/ripMapQueries';
import { uploadCapture } from '../../services/firebase/captures';
import {
  analyzeManualPhotoUpload,
  createFailedManualPhotoAnalysis,
  createSkippedManualVideoAnalysis,
} from '../../services/detection/manualMediaAnalysis';
import { RIP_CURRENT_MODEL } from '../../config/detection';
import {
  generateSessionId,
  saveMediaFile,
  saveMetadataFile,
} from '../../utils/capture';
import type {
  RipManualUploadDraft,
  RipManualUploadPhase,
  RipMapClusterSelection,
  RipMapPoint,
} from '../../types/ripMap';
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
  const [isManualUploadOpen, setIsManualUploadOpen] = useState(false);
  const [manualUploadPhase, setManualUploadPhase] =
    useState<RipManualUploadPhase>('idle');
  const { authUser } = useAuth();
  const { settings: detectionSettings } = useDetectionSettings();
  const manualAnalysisModel = useTensorflowModel(RIP_CURRENT_MODEL.asset);
  const manualAnalysisModelInstance = manualAnalysisModel.model;
  const manualAnalysisModelState = manualAnalysisModel.state;
  const manualAnalysisModelError =
    manualAnalysisModel.state === 'error' ? manualAnalysisModel.error : null;
  const {
    data: pointsByLayer,
    isLoading,
    error,
    refetch,
  } = useRipMapPointsQuery({ enabled: Boolean(authUser) });
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
      if (isManualUploadOpen) return;

      setIsLayerPickerOpen(false);
      setSelectedCluster(null);
      recordViewedPoint(point);
      setSelectedPoint(point);
    },
    [isManualUploadOpen, recordViewedPoint, setSelectedPoint],
  );

  const handleSelectCluster = useCallback(
    (cluster: RipMapClusterSelection) => {
      if (isManualUploadOpen) return;

      setIsLayerPickerOpen(false);
      clearSelection();
      setSelectedCluster(cluster);
    },
    [clearSelection, isManualUploadOpen],
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
    if (isManualUploadOpen) {
      setIsManualUploadOpen(false);
      clearDraftPin();
    }

    setSelectedCluster(null);
    setIsLayerPickerOpen(current => !current);
  }, [clearDraftPin, isManualUploadOpen]);

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
      if (isManualUploadOpen) return;

      setSelectedCluster(null);
      clearSelection();
    },
    [clearSelection, isManualUploadOpen, isPinPlacementMode, placeDraftPin],
  );

  const handleStartAdd = useCallback(() => {
    setIsLayerPickerOpen(false);
    setSelectedCluster(null);
    clearSelection();
    clearDraftPin();
    setIsManualUploadOpen(true);
  }, [clearDraftPin, clearSelection]);

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

    setIsManualUploadOpen(false);
    setSelectedCluster(null);
    clearSelection();
    clearDraftPin();
  }, [clearDraftPin, clearSelection, selectedCluster, selectedPoint]);

  const handleSubmitUpload = useCallback(
    async (draft: RipManualUploadDraft) => {
      const { title, notes, layerId, coordinate, media } = draft;
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        Alert.alert('Missing Upload Name', 'Enter a name for this upload.');
        return false;
      }
      if (!media) {
        Alert.alert(
          'Missing Media',
          'Select a photo or video before uploading.',
        );
        return false;
      }
      if (!coordinate) {
        Alert.alert('Missing Pin', 'Place a map pin before uploading.');
        return false;
      }
      if (!authUser) {
        Alert.alert('Not Signed In', 'Sign in before adding a map upload.');
        return false;
      }

      setManualUploadPhase('analyzing');
      try {
        const analysisResult =
          media.captureType === 'photo'
            ? await (async () => {
                try {
                  if (!manualAnalysisModelInstance) {
                    return createFailedManualPhotoAnalysis(
                      manualAnalysisModelState === 'error'
                        ? manualAnalysisModelError
                        : 'Detection model is not loaded yet.',
                      RIP_CURRENT_MODEL,
                      media,
                    );
                  }

                  return await analyzeManualPhotoUpload({
                    media,
                    model: manualAnalysisModelInstance,
                    modelConfig: RIP_CURRENT_MODEL,
                    detectionSettings,
                  });
                } catch (analysisError) {
                  return createFailedManualPhotoAnalysis(
                    analysisError,
                    RIP_CURRENT_MODEL,
                    media,
                  );
                }
              })()
            : createSkippedManualVideoAnalysis(media);

        setManualUploadPhase('uploading');
        const sessionId = generateSessionId();
        const mediaExt = media.captureType === 'video' ? 'mp4' : 'jpg';
        const mediaUri = await saveMediaFile(
          media.uri,
          sessionId,
          `manual.${mediaExt}`,
        );
        const trimmedNotes = notes.trim();
        const location = {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          capturedAt: new Date().toISOString(),
          providerTimestamp: new Date().toISOString(),
          source: 'manual_map_pin' as const,
        };
        const metadata = {
          sessionId,
          captureType: media.captureType,
          source: 'manual_media_upload',
          timestamp: new Date().toISOString(),
          location,
          layerId,
          title: trimmedTitle,
          notes: trimmedNotes,
          originalFileName: media.fileName,
          mimeType: media.mimeType,
          modelName: analysisResult.modelName,
          modelInputSize: analysisResult.modelInputSize,
          detectionSettings,
          screenWidth: analysisResult.mediaWidth,
          screenHeight: analysisResult.mediaHeight,
          mediaWidth: analysisResult.mediaWidth,
          mediaHeight: analysisResult.mediaHeight,
          durationMs: media.durationMs,
          totalFrames: analysisResult.frames.length,
          frames: analysisResult.frames,
          analysis: analysisResult.analysis,
        };
        const metadataUri = await saveMetadataFile(sessionId, metadata);

        await uploadCapture({
          userId: authUser.uid,
          sessionId,
          mediaUri,
          metadataUri,
          captureType: media.captureType,
          layerId,
          title: trimmedTitle,
          notes: trimmedNotes,
          location,
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
      } finally {
        setManualUploadPhase('idle');
      }
    },
    [
      authUser,
      clearDraftPin,
      detectionSettings,
      manualAnalysisModelError,
      manualAnalysisModelInstance,
      manualAnalysisModelState,
      refetch,
    ],
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
        isManualUploadOpen={isManualUploadOpen}
        isLoading={isLoading}
        manualUploadPhase={manualUploadPhase}
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
