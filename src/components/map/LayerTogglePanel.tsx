import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { RIP_MAP_LAYERS } from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type { RipMapLayerId, RipMapPointsByLayer } from '../../types/ripMap';

interface LayerTogglePanelProps {
  visibleLayerIds: RipMapLayerId[];
  pointsByLayer: RipMapPointsByLayer;
  onSelectLayer: (layerId: RipMapLayerId) => void;
}

function LayerTogglePanel({
  visibleLayerIds,
  pointsByLayer,
  onSelectLayer,
}: LayerTogglePanelProps) {
  const colors = useColors();
  const { scaleFont } = useResponsiveStyles();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Layers</Text>
      {RIP_MAP_LAYERS.map(layer => {
        const isVisible = visibleLayerIds.includes(layer.id);
        const pointCount = pointsByLayer[layer.id]?.length ?? 0;

        return (
          <TouchableOpacity
            key={layer.id}
            style={[
              styles.layerRow,
              {
                borderColor: colors.border,
                backgroundColor: isVisible
                  ? colors.backgroundSecondary
                  : colors.background,
              },
            ]}
            onPress={() => onSelectLayer(layer.id)}
          >
            <View style={styles.layerIdentity}>
              <View
                style={[
                  styles.layerColor,
                  {
                    backgroundColor: layer.color,
                  },
                ]}
              />
              <View style={styles.layerText}>
                <Text
                  style={[
                    styles.layerLabel,
                    { color: colors.textPrimary, fontSize: scaleFont(15) },
                  ]}
                >
                  {layer.label}
                </Text>
                <Text
                  style={[
                    styles.layerDescription,
                    { color: colors.textSecondary, fontSize: scaleFont(12) },
                  ]}
                  numberOfLines={2}
                >
                  {layer.description}
                </Text>
              </View>
            </View>
            <View style={styles.layerMeta}>
              <Text style={[styles.count, { color: colors.textTertiary }]}>
                {pointCount}
              </Text>
              <Icon
                name={isVisible ? 'radiobox-marked' : 'radiobox-blank'}
                size={22}
                color={isVisible ? colors.primary : colors.textTertiary}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  layerRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  layerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  layerColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  layerText: {
    flex: 1,
    gap: 2,
  },
  layerLabel: {
    fontWeight: '700',
  },
  layerDescription: {
    lineHeight: 16,
  },
  layerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default LayerTogglePanel;
