import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RIP_MAP_LAYERS } from '../../config/mapLayers';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type { RipMapLayerId } from '../../types/ripMap';
import LayerTile from './LayerTile';

interface LayerPickerGridProps {
  visibleLayerIds: RipMapLayerId[];
  onToggleLayer: (layerId: RipMapLayerId) => void;
}

function LayerPickerGrid({
  visibleLayerIds,
  onToggleLayer,
}: LayerPickerGridProps) {
  const { scaleHeight } = useResponsiveStyles();

  const s = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: scaleHeight(12),
    },
  });

  return (
    <View style={s.grid}>
      {RIP_MAP_LAYERS.map(layer => (
        <LayerTile
          key={layer.id}
          layer={layer}
          isActive={visibleLayerIds.includes(layer.id)}
          onPress={onToggleLayer}
        />
      ))}
    </View>
  );
}

export default LayerPickerGrid;
