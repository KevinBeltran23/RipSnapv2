import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Button from '../common/Button';
import PopupSheet from './PopupSheet';
import LayerPickerGrid from '../map/LayerPickerGrid';
import { RIP_MAP_LAYER_BY_ID } from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type {
  RipCoordinate,
  RipMapLayerId,
  RipMapPoint,
} from '../../types/ripMap';

interface FilterSheetProps {
  visibleLayerIds: RipMapLayerId[];
  visiblePoints: RipMapPoint[];
  selectedPoint: RipMapPoint | null;
  draftCoordinate: RipCoordinate | null;
  isPinPlacementMode: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  isLayerPickerOpen: boolean;
  error: string | null;
  onSelectPoint: (point: RipMapPoint) => void;
  onToggleLayer: (layerId: RipMapLayerId) => void;
  onStartAdd: () => void;
  onClosePopup: () => void;
  onCloseLayerPicker: () => void;
  onStartPinPlacement: () => void;
  onSubmitUpload: (draft: { title: string; notes: string }) => Promise<boolean>;
}

function FilterSheet({
  visibleLayerIds,
  visiblePoints,
  selectedPoint,
  draftCoordinate,
  isPinPlacementMode,
  isLoading,
  isSubmitting,
  isLayerPickerOpen,
  error,
  onSelectPoint,
  onToggleLayer,
  onStartAdd,
  onClosePopup,
  onStartPinPlacement,
  onSubmitUpload,
}: FilterSheetProps) {
  const [activeSnapIndex, setActiveSnapIndex] = useState(0);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const activeSnapIndexRef = useRef(0);
  const colors = useColors();
  const { height, scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const snapPoints = useMemo(
    () => [100, Math.round(height * 0.5), Math.round(height * 0.88)],
    [height],
  );

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderTopLeftRadius: proportionalSize(24),
      borderTopRightRadius: proportionalSize(24),
    }),
    [colors.background, proportionalSize],
  );

  const handleStartAdd = () => {
    setShowAddPopup(true);
    onStartAdd();
  };

  const handleClosePopup = () => {
    setShowAddPopup(false);
    onClosePopup();
  };

  const getSuggestedPoints = () => visiblePoints.slice(0, 6);

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
      <BottomSheetScrollView
        style={s.container}
        contentContainerStyle={s.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {showAddPopup ? (
          <PopupSheet
            mode="add"
            draftCoordinate={draftCoordinate}
            isPinPlacementMode={isPinPlacementMode}
            isSubmitting={isSubmitting}
            onClose={handleClosePopup}
            onAddPress={handleStartAdd}
            onStartPinPlacement={onStartPinPlacement}
            onSubmit={onSubmitUpload}
          />
        ) : selectedPoint ? (
          <PopupSheet
            mode="view"
            point={selectedPoint}
            draftCoordinate={draftCoordinate}
            isPinPlacementMode={isPinPlacementMode}
            isSubmitting={isSubmitting}
            onClose={handleClosePopup}
            onAddPress={handleStartAdd}
            onStartPinPlacement={onStartPinPlacement}
            onSubmit={onSubmitUpload}
          />
        ) : isLayerPickerOpen ? (
          <View>
            <Text style={s.layerPickerTitle}>Map Layers</Text>
            <LayerPickerGrid
              visibleLayerIds={visibleLayerIds}
              onToggleLayer={onToggleLayer}
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

            <Text style={s.sectionTitle}>Recent Uploads</Text>
            <View style={s.suggestedGrid}>
              {getSuggestedPoints().map(point => (
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
    </BottomSheet>
  );
}

export default FilterSheet;
