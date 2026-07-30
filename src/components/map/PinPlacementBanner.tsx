import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface PinPlacementBannerProps {
  onCancel: () => void;
}

function PinPlacementBanner({ onCancel }: PinPlacementBannerProps) {
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const s = StyleSheet.create({
    button: {
      position: 'absolute',
      top: scaleHeight(80),
      left: scaleWidth(16),
      right: scaleWidth(86),
      backgroundColor: colors.background,
      paddingVertical: scaleHeight(12),
      paddingHorizontal: proportionalSize(14),
      borderRadius: proportionalSize(8),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.2,
      shadowRadius: proportionalSize(4),
      elevation: 4,
    },
    text: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: scaleFont(14),
      textAlign: 'center',
    },
  });

  return (
    <TouchableOpacity style={s.button} onPress={onCancel}>
      <Text style={s.text}>
        Tap the map to place a pin. Tap here to cancel.
      </Text>
    </TouchableOpacity>
  );
}

export default PinPlacementBanner;
