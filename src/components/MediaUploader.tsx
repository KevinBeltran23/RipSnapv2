import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pick, types, keepLocalCopy } from '@react-native-documents/picker';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

interface MediaUploaderProps {
  onMediaSelected: (media: {
    path: string;
    type: 'image' | 'pdf' | 'video';
  }) => void;
}

function MediaUploader({ onMediaSelected }: MediaUploaderProps) {
  const [loading, setLoading] = useState(false);
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const handleAddImage = () => {
    Alert.alert(
      'Add an Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => selectImage('camera'),
        },
        {
          text: 'Choose from Library',
          onPress: () => selectImage('library'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  };

  const handleAddVideo = () => {
    Alert.alert(
      'Add a Video',
      'Choose an option',
      [
        {
          text: 'Record Video',
          onPress: () => selectVideo('camera'),
        },
        {
          text: 'Choose from Library',
          onPress: () => selectVideo('library'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  };

  const selectImage = async (source: 'camera' | 'library') => {
    try {
      setLoading(true);
      let result;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        onMediaSelected({ path: result.assets[0].uri, type: 'image' });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Image Picker Error', 'Failed to select image.');
    } finally {
      setLoading(false);
    }
  };

  const selectVideo = async (source: 'camera' | 'library') => {
    try {
      setLoading(true);
      let result;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        onMediaSelected({ path: result.assets[0].uri, type: 'video' });
      }
    } catch (error) {
      console.error('Video picker error:', error);
      Alert.alert('Video Picker Error', 'Failed to select video.');
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = async () => {
    try {
      setLoading(true);
      const [pickResult] = await pick({
        type: [types.pdf],
        mode: 'import',
      });

      if (pickResult?.uri) {
        const [copyResult] = await keepLocalCopy({
          files: [
            {
              uri: pickResult.uri,
              fileName: pickResult.name || `document-${Date.now()}.pdf`,
            },
          ],
          destination: 'cachesDirectory',
        });

        if (copyResult.status === 'success') {
          onMediaSelected({ path: copyResult.localUri, type: 'pdf' });
        } else {
          throw new Error('Failed to create a local copy of the document.');
        }
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('User canceled')) {
        console.error('Document picker error:', error);
        Alert.alert('Document Picker Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(16),
      marginVertical: scaleHeight(12),
      borderWidth: proportionalSize(1),
      borderStyle: 'dashed',
      borderColor: colors.primary,
      minHeight: scaleHeight(80),
      justifyContent: 'center',
    },
    loadingContainer: {
      alignItems: 'center',
    },
    loadingText: {
      marginTop: scaleHeight(8),
      color: colors.primary,
      fontSize: scaleFont(14),
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: scaleHeight(8),
      paddingHorizontal: scaleWidth(16),
      borderRadius: proportionalSize(8),
    },
    buttonText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
  });

  if (loading) {
    return (
      <View style={[dynamicStyles.container, dynamicStyles.loadingContainer]}>
        <ActivityIndicator size={proportionalSize(30)} color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.buttonContainer}>
        <TouchableOpacity style={dynamicStyles.button} onPress={handleAddImage}>
          <Text style={dynamicStyles.buttonText}>Add Image</Text>
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.button} onPress={handleAddVideo}>
          <Text style={dynamicStyles.buttonText}>Add Video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.button} onPress={selectDocument}>
          <Text style={dynamicStyles.buttonText}>Documents</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default MediaUploader;
