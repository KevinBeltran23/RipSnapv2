import React, { useState, useCallback } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text, useWindowDimensions, StyleProp, ViewStyle } from 'react-native';
import Pdf from 'react-native-pdf';
import Video from 'react-native-video';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface MediaViewerProps {
    source: string;
    type: 'image' | 'pdf' | 'video' | 'unknown';
    style?: StyleProp<ViewStyle>;
    onError?: (error: unknown) => void;
}

function MediaViewer({ source, type, style, onError }: MediaViewerProps) {
    const [imageLoading, setImageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const colors = useColors();
    const { height } = useWindowDimensions();
    const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

    const handleError = useCallback((err: unknown) => {
        let msg = 'Failed to load media.';
        if (type === 'pdf') msg = 'Failed to load PDF.';
        if (type === 'image') msg = 'Failed to load Image.';
        setError(msg);
        setImageLoading(false);
        onError?.(err);
    }, [onError, type]);

    const s = StyleSheet.create({
        base: { width: '100%', backgroundColor: colors.backgroundSecondary, borderRadius: proportionalSize(8), overflow: 'hidden' },
        errorContainer: { justifyContent: 'center', alignItems: 'center', minHeight: scaleHeight(200), padding: proportionalSize(16) },
        errorText: { color: colors.error, fontWeight: '600', fontSize: scaleFont(16) },
        imageContainer: { width: '100%', height: scaleHeight(200) },
        image: { width: '100%', height: '100%' },
        video: { width: '100%', height: scaleHeight(300) },
        pdfContainer: { width: '100%', height: height * 0.6 },
        pdf: { flex: 1, width: '100%', height: '100%' },
        unknown: { minHeight: scaleHeight(150), justifyContent: 'center', alignItems: 'center' },
        unknownText: { color: colors.textSecondary, fontSize: scaleFont(14) },
    });

    if (error) return <View style={[s.base, s.errorContainer, style]}><Text style={s.errorText}>{error}</Text></View>;

    const content = (() => {
        switch (type) {
            case 'image': return (
                <View style={s.imageContainer}>
                    <Image source={{ uri: source }} style={s.image} resizeMode="cover" onError={handleError} onLoadStart={() => setImageLoading(true)} onLoadEnd={() => setImageLoading(false)} />
                    {imageLoading && <ActivityIndicator style={StyleSheet.absoluteFill} size={proportionalSize(30)} color={colors.primary} />}
                </View>
            );
            case 'video': return <Video source={{ uri: source }} style={s.video} controls resizeMode="contain" onError={handleError} />;
            case 'pdf': return <View style={s.pdfContainer}><Pdf source={{ uri: source, cache: true }} style={s.pdf} onError={handleError} trustAllCerts={false} /></View>;
            default: return <View style={s.unknown}><Text style={s.unknownText}>Unsupported media type</Text></View>;
        }
    })();

    return <View style={[s.base, style]}>{content}</View>;
}

export default MediaViewer;
