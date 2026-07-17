import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type { RipMapLayer, RipMapLayerId } from '../../types/ripMap';

type IconName = React.ComponentProps<typeof Icon>['name'];

interface LayerTileProps {
  layer: RipMapLayer;
  isActive: boolean;
  onPress: (layerId: RipMapLayerId) => void;
}

function LayerTile({ layer, isActive, onPress }: LayerTileProps) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const s = StyleSheet.create({
    tile: {
      width: '31%',
      minHeight: scaleHeight(92),
      borderRadius: proportionalSize(8),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isActive ? layer.color : colors.border,
      borderBottomWidth: proportionalSize(isActive ? 3 : 1),
      backgroundColor: isActive
        ? colors.primaryLight
        : colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scaleHeight(12),
      paddingHorizontal: proportionalSize(8),
      gap: scaleHeight(8),
    },
    iconWrap: {
      width: proportionalSize(42),
      height: proportionalSize(42),
      borderRadius: proportionalSize(21),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isActive ? colors.background : colors.background,
    },
    label: {
      color: isActive ? colors.textPrimary : colors.textSecondary,
      fontSize: scaleFont(12),
      fontWeight: '700',
      textAlign: 'center',
    },
    badge: {
      position: 'absolute',
      right: proportionalSize(8),
      top: proportionalSize(8),
      width: proportionalSize(18),
      height: proportionalSize(18),
      borderRadius: proportionalSize(9),
      backgroundColor: layer.color,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <TouchableOpacity
      style={s.tile}
      onPress={() => onPress(layer.id)}
      accessibilityLabel={`${layer.label}, ${isActive ? 'active' : 'inactive'}`}
      accessibilityRole="button"
    >
      {isActive && (
        <View style={s.badge}>
          <Icon name="check" size={scaleFont(12)} color={colors.textInverse} />
        </View>
      )}
      <View style={s.iconWrap}>
        <Icon
          name={layer.icon as IconName}
          size={scaleFont(26)}
          color={isActive ? layer.color : colors.textTertiary}
        />
      </View>
      <Text style={s.label} numberOfLines={2}>
        {layer.label}
      </Text>
    </TouchableOpacity>
  );
}

export default LayerTile;
