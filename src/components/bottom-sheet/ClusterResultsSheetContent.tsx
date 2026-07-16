import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { RIP_MAP_LAYER_BY_ID, RIP_MAP_LAYERS } from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type {
  RipMapClusterSelection,
  RipMapLayerId,
  RipMapPoint,
} from '../../types/ripMap';

interface ClusterResultsSheetContentProps {
  cluster: RipMapClusterSelection;
  onSelectPoint: (point: RipMapPoint) => void;
  onClose: () => void;
}

const formatDisplayDate = (createdAt?: string) => {
  if (!createdAt) return 'Unknown time';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleDateString();
};

function ClusterResultsSheetContent({
  cluster,
  onSelectPoint,
  onClose,
}: ClusterResultsSheetContentProps) {
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const layerCounts = useMemo(() => {
    const counts = cluster.points.reduce(
      (nextCounts, point) => {
        nextCounts[point.layerId] = (nextCounts[point.layerId] ?? 0) + 1;
        return nextCounts;
      },
      {} as Partial<Record<RipMapLayerId, number>>,
    );

    return RIP_MAP_LAYERS.map(layer => ({
      layer,
      count: counts[layer.id] ?? 0,
    })).filter(({ count }) => count > 0);
  }, [cluster.points]);

  const s = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: {
      padding: proportionalSize(16),
      paddingBottom: scaleHeight(28),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: scaleWidth(12),
      marginBottom: scaleHeight(12),
    },
    headerText: { flex: 1 },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(18),
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      fontWeight: '600',
      marginTop: scaleHeight(4),
    },
    closeButton: {
      borderRadius: proportionalSize(8),
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: scaleWidth(12),
      paddingVertical: scaleHeight(7),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    closeText: {
      color: colors.textPrimary,
      fontSize: scaleFont(12),
      fontWeight: '800',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleWidth(8),
      marginBottom: scaleHeight(14),
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleWidth(6),
      borderRadius: proportionalSize(999),
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: scaleWidth(10),
      paddingVertical: scaleHeight(6),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    chipDot: {
      width: proportionalSize(8),
      height: proportionalSize(8),
      borderRadius: proportionalSize(4),
    },
    chipText: {
      color: colors.textPrimary,
      fontSize: scaleFont(11),
      fontWeight: '800',
    },
    row: {
      flexDirection: 'row',
      gap: scaleWidth(12),
      borderRadius: proportionalSize(8),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: proportionalSize(12),
      marginBottom: scaleHeight(10),
    },
    mediaSlot: {
      width: scaleWidth(42),
      height: scaleWidth(42),
      borderRadius: proportionalSize(8),
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    layerDot: {
      width: proportionalSize(14),
      height: proportionalSize(14),
      borderRadius: proportionalSize(7),
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(15),
      fontWeight: '800',
      marginBottom: scaleHeight(4),
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleWidth(8),
      marginBottom: scaleHeight(4),
    },
    metaText: {
      color: colors.textSecondary,
      fontSize: scaleFont(11),
      fontWeight: '700',
    },
    notes: {
      color: colors.textTertiary,
      fontSize: scaleFont(12),
      fontWeight: '600',
    },
  });

  const renderHeader = () => (
    <>
      <View style={s.header}>
        <View style={s.headerText}>
          <Text style={s.title}>{cluster.pointCount} uploads in this area</Text>
          <Text style={s.subtitle}>
            {cluster.points.length === cluster.pointCount
              ? 'Select an upload to view details.'
              : `Showing ${cluster.points.length} visible uploads.`}
          </Text>
        </View>
        <TouchableOpacity style={s.closeButton} onPress={onClose}>
          <Text style={s.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={s.chips}>
        {layerCounts.map(({ layer, count }) => (
          <View key={layer.id} style={s.chip}>
            <View style={[s.chipDot, { backgroundColor: layer.color }]} />
            <Text style={s.chipText}>
              {layer.label} {count}
            </Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <BottomSheetFlatList
      style={s.container}
      contentContainerStyle={s.contentContainer}
      data={cluster.points}
      keyExtractor={(point: RipMapPoint) => point.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={renderHeader}
      renderItem={({ item: point }: { item: RipMapPoint }) => {
        const layer = RIP_MAP_LAYER_BY_ID[point.layerId];
        return (
          <TouchableOpacity style={s.row} onPress={() => onSelectPoint(point)}>
            <View style={s.mediaSlot}>
              <View style={[s.layerDot, { backgroundColor: layer.color }]} />
            </View>
            <View style={s.rowBody}>
              <Text style={s.rowTitle} numberOfLines={1}>
                {point.title}
              </Text>
              <View style={s.metaRow}>
                <Text style={s.metaText} numberOfLines={1}>
                  {layer.label}
                </Text>
                <Text style={s.metaText} numberOfLines={1}>
                  {formatDisplayDate(point.createdAt)}
                </Text>
                <Text style={s.metaText} numberOfLines={1}>
                  {point.captureType}
                </Text>
              </View>
              <Text style={s.notes} numberOfLines={1}>
                {point.notes ?? 'No notes'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

export default ClusterResultsSheetContent;
