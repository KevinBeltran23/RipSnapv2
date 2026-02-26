import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface PinPlacementBannerProps {
    onCancel: () => void;
}

function PinPlacementBanner({ onCancel }: PinPlacementBannerProps) {
    const colors = useColors();
    const { scaleHeight, scaleWidth, proportionalSize, scaleFont, isMediumScreen, isLargeScreen } = useResponsiveStyles();

    const isLarge = isMediumScreen || isLargeScreen;
    const s = StyleSheet.create({
        button: {
            position: 'absolute',
            top: isLarge ? scaleHeight(60) : scaleHeight(80),
            right: isLarge ? scaleWidth(70) : scaleWidth(100),
            backgroundColor: colors.error,
            padding: proportionalSize(10),
            borderRadius: proportionalSize(8),
        },
        text: { color: colors.textInverse, fontWeight: 'bold', fontSize: scaleFont(14) },
    });

    return (
        <TouchableOpacity style={s.button} onPress={onCancel}>
            <Text style={s.text}>Cancel</Text>
        </TouchableOpacity>
    );
}

export default PinPlacementBanner;
