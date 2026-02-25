import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Pdf from 'react-native-pdf';
import Video from 'react-native-video';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

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

  const handleError = useCallback(
    (err: unknown) => {
      console.error('Media loading error:', err);
      let errorMessage = 'Failed to load media.';
      if (type === 'pdf') errorMessage = 'Failed to load PDF.';
      if (type === 'image') errorMessage = 'Failed to load Image.';
      setError(errorMessage);

      setImageLoading(false);

      if (onError) {
        onError(err);
      }
    },
    [onError, type],
  );

  const dynamicStyles = StyleSheet.create({
    base: {
      width: '100%',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      overflow: 'hidden',
    },
    errorContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: scaleHeight(200),
      padding: proportionalSize(16),
    },
    errorText: {
      color: colors.error,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    imageContainer: {
      width: '100%',
      height: scaleHeight(200),
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderButton: {
      backgroundColor: colors.primary,
      paddingVertical: scaleHeight(12),
      paddingHorizontal: proportionalSize(24),
      borderRadius: proportionalSize(8),
      minHeight: scaleHeight(150),
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderButtonText: {
      color: colors.textInverse,
      fontWeight: 'bold',
      fontSize: scaleFont(16),
    },
    video: {
      width: '100%',
      height: scaleHeight(300),
    },
    pdfContainer: {
      width: '100%',
      height: height * 0.6,
    },
    pdf: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    unknownContainer: {
      minHeight: scaleHeight(150),
      justifyContent: 'center',
      alignItems: 'center',
    },
    unknownText: {
      color: colors.textSecondary,
      fontSize: scaleFont(14),
    },
  });

  const renderContent = () => {
    if (error) {
      return (
        <View style={dynamicStyles.errorContainer}>
          <Text style={dynamicStyles.errorText}>{error}</Text>
        </View>
      );
    }

    switch (type) {
      case 'image':
        return (
          <View style={dynamicStyles.imageContainer}>
            <Image
              source={{ uri: source }}
              style={dynamicStyles.image}
              resizeMode="cover"
              onError={handleError}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <ActivityIndicator
                style={StyleSheet.absoluteFill}
                size={proportionalSize(30)}
                color={colors.primary}
              />
            )}
          </View>
        );

      case 'video':
        return (
          <Video
            source={{ uri: source }}
            style={dynamicStyles.video}
            controls={true}
            resizeMode="contain"
            onError={handleError}
          />
        );

      case 'pdf':
        return (
          <View style={dynamicStyles.pdfContainer}>
            <Pdf
              source={{ uri: source, cache: true }}
              style={dynamicStyles.pdf}
              onError={handleError}
              trustAllCerts={false}
            />
          </View>
        );

      default:
        return (
          <View style={dynamicStyles.unknownContainer}>
            <Text style={dynamicStyles.unknownText}>
              Unsupported media type
            </Text>
          </View>
        );
    }
  };

  return <View style={[dynamicStyles.base, style]}>{renderContent()}</View>;
}

export default MediaViewer;
