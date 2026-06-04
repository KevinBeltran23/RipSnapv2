import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type { RipMapLayerId } from '../../types/ripMap';
import LayerPickerGrid from './LayerPickerGrid';

interface LayerPickerSheetProps {
  isOpen: boolean;
  visibleLayerIds: RipMapLayerId[];
  onToggleLayer: (layerId: RipMapLayerId) => void;
  onClose: () => void;
}

function LayerPickerSheet({
  isOpen,
  visibleLayerIds,
  onToggleLayer,
  onClose,
}: LayerPickerSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();
  const snapPoints = useMemo(() => ['34%'], []);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderTopLeftRadius: proportionalSize(24),
      borderTopRightRadius: proportionalSize(24),
    }),
    [colors.background, proportionalSize],
  );

  if (!isOpen) return null;

  const s = StyleSheet.create({
    sheet: {
      zIndex: 1200,
    },
    content: {
      paddingHorizontal: proportionalSize(16),
      paddingTop: scaleHeight(4),
      paddingBottom: scaleHeight(28),
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(18),
      fontWeight: '800',
      marginBottom: scaleHeight(14),
    },
  });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={index => {
        if (index === -1) onClose();
      }}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{
        backgroundColor: colors.gray300,
        width: scaleWidth(40),
      }}
      style={s.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={s.content}
        accessibilityViewIsModal
      >
        <View>
          <Text style={s.title}>Map Layers</Text>
          <LayerPickerGrid
            visibleLayerIds={visibleLayerIds}
            onToggleLayer={onToggleLayer}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

export default LayerPickerSheet;
