import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Button from '../common/Button';
import ClusterResultsSheetContent from './ClusterResultsSheetContent';
import ManualUploadSheetContent from './ManualUploadSheetContent';
import PopupSheet from './PopupSheet';
import LayerPickerGrid from '../map/LayerPickerGrid';
import { RIP_MAP_LAYER_BY_ID } from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type {
  RipCoordinate,
  RipManualUploadDraft,
  RipManualUploadPhase,
  RipManualUploadProgress,
  RipMapClusterSelection,
  RipMapLayerId,
  RipMapPoint,
} from '../../types/ripMap';

interface FilterSheetProps {
  visibleLayerIds: RipMapLayerId[];
  visiblePoints: RipMapPoint[];
  recentlyViewedPoints: RipMapPoint[];
  selectedPoint: RipMapPoint | null;
  selectedCluster: RipMapClusterSelection | null;
  draftCoordinate: RipCoordinate | null;
  isPinPlacementMode: boolean;
  isManualUploadOpen: boolean;
  isLoading: boolean;
  manualUploadPhase: RipManualUploadPhase;
  manualUploadProgress: RipManualUploadProgress | null;
  isLayerPickerOpen: boolean;
  error: string | null;
  onSelectPoint: (point: RipMapPoint) => void;
  onSelectClusterPoint: (point: RipMapPoint) => void;
  onCloseCluster: () => void;
  onSelectLayer: (layerId: RipMapLayerId) => void;
  onStartAdd: () => void;
  onClosePopup: () => void;
  onCloseLayerPicker: () => void;
  onStartPinPlacement: () => void;
  onSubmitUpload: (draft: RipManualUploadDraft) => Promise<boolean>;
}

function FilterSheet({
  visibleLayerIds,
  visiblePoints,
  recentlyViewedPoints,
  selectedPoint,
  selectedCluster,
  draftCoordinate,
  isPinPlacementMode,
  isManualUploadOpen,
  isLoading,
  manualUploadPhase,
  manualUploadProgress,
  isLayerPickerOpen,
  error,
  onSelectPoint,
  onSelectClusterPoint,
  onCloseCluster,
  onSelectLayer,
  onStartAdd,
  onClosePopup,
  onStartPinPlacement,
  onSubmitUpload,
}: FilterSheetProps) {
  const [activeSnapIndex, setActiveSnapIndex] = useState(0);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const activeSnapIndexRef = useRef(0);
  const colors = useColors();
  const { height, scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const snapPoints = useMemo(
    () => [100, Math.round(height * 0.5), Math.round(height * 0.88)],
    [height],
  );

  useEffect(() => {
    if (selectedCluster && activeSnapIndexRef.current === 0) {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [selectedCluster]);

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderTopLeftRadius: proportionalSize(24),
      borderTopRightRadius: proportionalSize(24),
    }),
    [colors.background, proportionalSize],
  );

  const handleStartAdd = () => {
    onStartAdd();
  };

  const handleClosePopup = () => {
    onClosePopup();
  };

  const s = StyleSheet.create({
    bottomSheet: { zIndex: 100 },
    container: { flex: 1 },
    contentContainer: { padding: proportionalSize(16) },
    addDataButton: {
      marginTop: scaleHeight(8),
      marginBottom: scaleHeight(16),
      marginHorizontal: scaleWidth(4),
    },
    statusText: {
      color: error ? colors.error : colors.textSecondary,
      fontSize: scaleFont(13),
      fontWeight: '600',
      marginBottom: scaleHeight(12),
    },
    sectionTitle: {
      color: colors.textPrimary,
      marginTop: scaleHeight(10),
      marginBottom: scaleHeight(8),
      fontSize: scaleFont(16),
      fontWeight: '700',
    },
    suggestedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: scaleWidth(8),
    },
    suggestedItem: {
      width: scaleWidth(160),
      minHeight: scaleHeight(58),
      borderRadius: proportionalSize(8),
      marginBottom: scaleHeight(10),
      justifyContent: 'center',
      padding: proportionalSize(10),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    suggestedTitle: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: scaleFont(14),
      marginBottom: scaleHeight(3),
    },
    suggestedMeta: {
      color: colors.textSecondary,
      fontSize: scaleFont(11),
    },
    layerPickerTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(18),
      fontWeight: '800',
      marginBottom: scaleHeight(14),
    },
  });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={activeSnapIndex}
      snapPoints={snapPoints}
      onChange={index => {
        if (index >= 0) {
          activeSnapIndexRef.current = index;
          setActiveSnapIndex(index);
        }
      }}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{
        backgroundColor: colors.gray300,
        width: scaleWidth(40),
      }}
      enablePanDownToClose={false}
      style={s.bottomSheet}
    >
      {selectedCluster &&
      !isManualUploadOpen &&
      !selectedPoint &&
      !isLayerPickerOpen ? (
        <ClusterResultsSheetContent
          cluster={selectedCluster}
          onSelectPoint={onSelectClusterPoint}
          onClose={onCloseCluster}
        />
      ) : (
        <BottomSheetScrollView
          style={s.container}
          contentContainerStyle={s.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {isManualUploadOpen ? (
            <ManualUploadSheetContent
              draftCoordinate={draftCoordinate}
              isPinPlacementMode={isPinPlacementMode}
              submitPhase={manualUploadPhase}
              analysisProgress={manualUploadProgress}
              onClose={handleClosePopup}
              onStartPinPlacement={onStartPinPlacement}
              onSubmit={onSubmitUpload}
            />
          ) : selectedPoint ? (
            <PopupSheet
              mode="view"
              point={selectedPoint}
              draftCoordinate={draftCoordinate}
              isPinPlacementMode={isPinPlacementMode}
              isSubmitting={false}
              closeLabel={selectedCluster ? 'Back' : 'Close'}
              onClose={handleClosePopup}
              onAddPress={handleStartAdd}
              onStartPinPlacement={onStartPinPlacement}
            />
          ) : isLayerPickerOpen ? (
            <View>
              <Text style={s.layerPickerTitle}>Map Layers</Text>
              <LayerPickerGrid
                visibleLayerIds={visibleLayerIds}
                onSelectLayer={onSelectLayer}
              />
            </View>
          ) : (
            <>
              <Button
                variant="secondary"
                label="Add Upload"
                onPress={handleStartAdd}
                style={s.addDataButton}
              />

              {isLoading && (
                <Text style={s.statusText}>Loading map uploads...</Text>
              )}
              {error && <Text style={s.statusText}>{error}</Text>}
              {!isLoading && !error && visiblePoints.length === 0 && (
                <Text style={s.statusText}>
                  No visible uploads for enabled layers.
                </Text>
              )}

              <Text style={s.sectionTitle}>Recently Viewed</Text>
              {recentlyViewedPoints.length === 0 && (
                <Text style={s.statusText}>
                  Tap map uploads to build your recently viewed list.
                </Text>
              )}
              <View style={s.suggestedGrid}>
                {recentlyViewedPoints.map(point => (
                  <TouchableOpacity
                    key={point.id}
                    style={s.suggestedItem}
                    onPress={() => onSelectPoint(point)}
                  >
                    <Text style={s.suggestedTitle} numberOfLines={1}>
                      {point.title}
                    </Text>
                    <Text style={s.suggestedMeta} numberOfLines={1}>
                      {RIP_MAP_LAYER_BY_ID[point.layerId].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
}

export default FilterSheet;
