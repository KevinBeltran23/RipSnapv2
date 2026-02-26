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
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

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

  const selectImage = async (source: 'camera' | 'library') => {
    try {
      setLoading(true);
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
            });
      if (!result.canceled && result.assets[0]?.uri)
        onMediaSelected({ path: result.assets[0].uri, type: 'image' });
    } catch {
      Alert.alert('Image Picker Error', 'Failed to select image.');
    } finally {
      setLoading(false);
    }
  };

  const selectVideo = async (source: 'camera' | 'library') => {
    try {
      setLoading(true);
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              allowsEditing: false,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            });
      if (!result.canceled && result.assets[0]?.uri)
        onMediaSelected({ path: result.assets[0].uri, type: 'video' });
    } catch {
      Alert.alert('Video Picker Error', 'Failed to select video.');
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = async () => {
    try {
      setLoading(true);
      const [pickResult] = await pick({ type: [types.pdf], mode: 'import' });
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
        if (copyResult.status === 'success')
          onMediaSelected({ path: copyResult.localUri, type: 'pdf' });
        else throw new Error('Failed to create a local copy of the document.');
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('User canceled'))
        Alert.alert(
          'Document Picker Error',
          'Failed to open document. Please try again.',
        );
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () =>
    Alert.alert(
      'Add an Image',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => selectImage('camera') },
        { text: 'Choose from Library', onPress: () => selectImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  const handleAddVideo = () =>
    Alert.alert(
      'Add a Video',
      'Choose an option',
      [
        { text: 'Record Video', onPress: () => selectVideo('camera') },
        { text: 'Choose from Library', onPress: () => selectVideo('library') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );

  const s = StyleSheet.create({
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
    loadingContainer: { alignItems: 'center' },
    loadingText: {
      marginTop: scaleHeight(8),
      color: colors.primary,
      fontSize: scaleFont(14),
    },
    row: { flexDirection: 'row', justifyContent: 'space-around' },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: scaleHeight(8),
      paddingHorizontal: scaleWidth(16),
      borderRadius: proportionalSize(8),
    },
    btnText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
  });

  if (loading)
    return (
      <View style={[s.container, s.loadingContainer]}>
        <ActivityIndicator size={proportionalSize(30)} color={colors.primary} />
        <Text style={s.loadingText}>Processing...</Text>
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={handleAddImage}>
          <Text style={s.btnText}>Add Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={handleAddVideo}>
          <Text style={s.btnText}>Add Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={selectDocument}>
          <Text style={s.btnText}>Documents</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default MediaUploader;
