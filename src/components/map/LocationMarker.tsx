import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { LocationData } from '../../types/location';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface LocationMarkerProps {
  location: LocationData;
  onPress: (location: LocationData) => void;
}

function LocationMarker({ location, onPress }: LocationMarkerProps) {
  const colors = useColors();
  const { scaleWidth, scaleHeight, scaleFont } = useResponsiveStyles();

  const s = StyleSheet.create({
    callout: {
      padding: scaleWidth(8),
      minWidth: scaleWidth(120),
      backgroundColor: colors.background,
    },
    title: {
      fontWeight: 'bold',
      fontSize: scaleFont(14),
      marginBottom: scaleHeight(4),
      color: colors.textPrimary,
    },
    subtitle: { fontSize: scaleFont(12), color: colors.textSecondary },
  });

  return (
    <Marker
      key={location.id}
      coordinate={location.coordinates}
      pinColor={colors[location.severityColor]}
      onPress={() => onPress(location)}
    >
      <Callout>
        <View style={s.callout}>
          <Text style={s.title}>{location.name}</Text>
          <Text style={s.subtitle}>{location.severity}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

export default LocationMarker;
