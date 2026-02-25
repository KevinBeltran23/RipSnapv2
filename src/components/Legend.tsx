// src/components/Legend.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SEVERITY_OPTIONS } from '../constants';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

interface LegendProps {
  visible: boolean;
}

function Legend({ visible }: LegendProps) {
  const colors = useColors();
  const { scaleHeight, scaleWidth, scaleFont, isMediumScreen, isLargeScreen } =
    useResponsiveStyles();

  if (!visible) return null;

  const dynamicStyles = StyleSheet.create({
    // Base styles (for smaller screens / phones)
    container: {
      position: 'absolute',
      top: scaleHeight(60),
      left: scaleWidth(10),
      backgroundColor: colors.backgroundSecondary,
      padding: scaleFont(10),
      borderRadius: scaleFont(8),
      shadowColor: colors.shadow,
      shadowOffset: { width: scaleWidth(0), height: scaleHeight(2) },
      shadowOpacity: 0.25,
      shadowRadius: scaleFont(4),
      elevation: 5,
      minWidth: scaleWidth(180),
      ...((isMediumScreen || isLargeScreen) && {
        top: scaleHeight(40),
        left: scaleWidth(15),
        minWidth: scaleWidth(130),
      }),
    },
    title: {
      fontWeight: 'bold',
      fontSize: scaleFont(16),
      marginBottom: scaleHeight(10),
      textAlign: 'center',
      color: colors.textPrimary,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: scaleHeight(5),
    },
    legendCircle: {
      width: scaleFont(24),
      height: scaleFont(24),
      borderRadius: scaleFont(12),
    },
    legendText: {
      marginLeft: scaleWidth(10),
      fontSize: scaleFont(14),
      color: colors.textPrimary,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Accessibility Legend</Text>

      {SEVERITY_OPTIONS.map(option => (
        <View key={option.id} style={dynamicStyles.legendItem}>
          <View
            style={[
              dynamicStyles.legendCircle,
              { backgroundColor: colors[option.color] },
            ]}
          />
          <Text style={dynamicStyles.legendText}>{option.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default Legend;
