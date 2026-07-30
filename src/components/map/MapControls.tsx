import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface MapControlsProps {
  onLocate: () => void;
  onReload: () => void;
  isLoading: boolean;
  onLayersPress: () => void;
}

function MapControls({
  onLocate,
  onReload,
  isLoading,
  onLayersPress,
}: MapControlsProps) {
  const colors = useColors();
  const {
    scaleHeight,
    scaleWidth,
    scaleFont,
    proportionalSize,
    isMediumScreen,
    isLargeScreen,
  } = useResponsiveStyles();

  const isLarge = isMediumScreen || isLargeScreen;
  const s = StyleSheet.create({
    base: {
      position: 'absolute',
      right: scaleWidth(20),
      backgroundColor: colors.background,
      width: scaleFont(50),
      height: scaleFont(50),
      borderRadius: proportionalSize(25),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.25,
      shadowRadius: proportionalSize(3.84),
      elevation: 5,
    },
    locate: { top: isLarge ? scaleHeight(60) : scaleHeight(80) },
    layers: { top: isLarge ? scaleHeight(120) : scaleHeight(140) },
    reload: { top: isLarge ? scaleHeight(180) : scaleHeight(200) },
  });

  return (
    <>
      <TouchableOpacity style={[s.base, s.locate]} onPress={onLocate}>
        <Icon
          name="crosshairs-gps"
          size={scaleFont(24)}
          color={colors.primary}
        />
      </TouchableOpacity>
      <TouchableOpacity style={[s.base, s.layers]} onPress={onLayersPress}>
        <Icon name="layers" size={scaleFont(24)} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.base, s.reload]}
        onPress={onReload}
        disabled={isLoading}
      >
        <Icon
          name={isLoading ? 'loading' : 'refresh'}
          size={scaleFont(24)}
          color={isLoading ? colors.gray400 : colors.primary}
        />
      </TouchableOpacity>
    </>
  );
}

export default MapControls;
