import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface MediaItem { url: string; type: string; }
interface GalleryGridProps { media: MediaItem[]; onImagePress?: (index: number) => void; }

function GalleryGrid({ media, onImagePress }: GalleryGridProps) {
    const colors = useColors();
    const { width } = useWindowDimensions();
    const { scaleWidth, scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

    const s = StyleSheet.create({
        gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: proportionalSize(8), marginTop: scaleHeight(8), marginBottom: scaleHeight(16) },
        item: { width: (width - scaleWidth(64)) / 4, height: (width - scaleWidth(64)) / 4, borderRadius: proportionalSize(8), overflow: 'hidden' },
        image: { width: '100%', height: '100%' },
        placeholder: { width: '100%', height: '100%', backgroundColor: colors.gray200, borderRadius: proportionalSize(8), justifyContent: 'center', alignItems: 'center' },
        placeholderText: { fontWeight: 'bold', color: colors.gray500, fontSize: scaleFont(14) },
    });

    return (
        <View style={s.gallery}>
            {media.map((item, i) => (
                <TouchableOpacity key={i} style={s.item} onPress={() => onImagePress?.(i)}>
                    {item.type === 'image'
                        ? <Image source={{ uri: item.url }} style={s.image} />
                        : <View style={s.placeholder}><Text style={s.placeholderText}>{item.type.toUpperCase()}</Text></View>}
                </TouchableOpacity>
            ))}
        </View>
    );
}

export default GalleryGrid;
