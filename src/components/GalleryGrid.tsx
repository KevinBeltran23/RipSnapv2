// src/components/molecules/GalleryGrid.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles'; // Import useResponsiveStyles

interface MediaItem {
  url: string;
  type: string;
}

interface GalleryGridProps {
  media: MediaItem[];
  onImagePress?: (index: number) => void;
}

function GalleryGrid({ media, onImagePress }: GalleryGridProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { scaleWidth, scaleHeight, proportionalSize, scaleFont } =
    useResponsiveStyles(); // Destructure scaling functions

  const dynamicStyles = StyleSheet.create({
    gallery: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: proportionalSize(8), // Scaled
      marginTop: scaleHeight(8), // Scaled
      marginBottom: scaleHeight(16), // Scaled
    },
    galleryItem: {
      width: (width - scaleWidth(64)) / 4, // Scaled the fixed dp value
      height: (width - scaleWidth(64)) / 4, // Scaled the fixed dp value
      borderRadius: proportionalSize(8), // Scaled
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.gray200,
      borderRadius: proportionalSize(8), // Scaled
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontWeight: 'bold',
      color: colors.gray500,
      fontSize: scaleFont(14), // Scaled
    },
  });

  return (
    <>
      <View style={dynamicStyles.gallery}>
        {media.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={dynamicStyles.galleryItem}
            onPress={() => onImagePress && onImagePress(i)}
          >
            {item.type === 'image' ? (
              <Image source={{ uri: item.url }} style={dynamicStyles.image} />
            ) : (
              <View style={dynamicStyles.placeholder}>
                <Text style={dynamicStyles.placeholderText}>
                  {item.type.toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

export default GalleryGrid;
