import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Video from 'react-native-video';
import Button from '../common/Button';
import DropdownSelector from '../common/DropdownSelector';
import {
  getUploadableRipMapLayers,
  RIP_MAP_LAYER_BY_ID,
} from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type {
  RipCoordinate,
  RipManualUploadDraft,
  RipManualUploadMedia,
  RipManualUploadPhase,
  RipManualUploadProgress,
  RipMapLayerId,
} from '../../types/ripMap';

interface ManualUploadSheetContentProps {
  isAdmin: boolean;
  draftCoordinate: RipCoordinate | null;
  isPinPlacementMode: boolean;
  submitPhase: RipManualUploadPhase;
  analysisProgress: RipManualUploadProgress | null;
  onClose: () => void;
  onStartPinPlacement: () => void;
  onSubmit: (draft: RipManualUploadDraft) => Promise<boolean>;
}

const formatCoordinate = (coordinate: RipCoordinate) =>
  `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;

const getAssetCaptureType = (
  asset: ImagePicker.ImagePickerAsset,
): RipManualUploadMedia['captureType'] | null => {
  if (asset.type === 'image') return 'photo';
  if (asset.type === 'video') return 'video';

  const mimeType = asset.mimeType?.toLowerCase();
  if (mimeType?.startsWith('image/')) return 'photo';
  if (mimeType?.startsWith('video/')) return 'video';

  return null;
};

function ManualUploadSheetContent({
  isAdmin,
  draftCoordinate,
  isPinPlacementMode,
  submitPhase,
  analysisProgress,
  onClose,
  onStartPinPlacement,
  onSubmit,
}: ManualUploadSheetContentProps) {
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLayerId, setSelectedLayerId] =
    useState<RipMapLayerId>('public');
  const [media, setMedia] = useState<RipManualUploadMedia | null>(null);
  const uploadableLayers = getUploadableRipMapLayers(isAdmin);

  useEffect(() => {
    setTitle('');
    setNotes('');
    setSelectedLayerId('public');
    setMedia(null);
  }, []);

  useEffect(() => {
    if (!isAdmin && selectedLayerId === 'admin') {
      setSelectedLayerId('public');
    }
  }, [isAdmin, selectedLayerId]);

  const selectedLayer = RIP_MAP_LAYER_BY_ID[selectedLayerId];
  const isSubmitting = submitPhase !== 'idle';
  const submitLabel =
    submitPhase === 'analyzing'
      ? analysisProgress
        ? `Analyzing ${analysisProgress.processedFrames}/${analysisProgress.totalFrames}...`
        : 'Analyzing...'
      : submitPhase === 'uploading'
        ? 'Uploading...'
        : 'Upload Data';

  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Media Access Needed',
        'Allow photo library access to select pre-captured media.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      base64: true,
      quality: 1,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const captureType = getAssetCaptureType(asset);
    if (!captureType) {
      Alert.alert(
        'Unsupported Media',
        'Select a photo or video file for this upload.',
      );
      return;
    }

    setMedia({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined,
      captureType,
      analysisBase64:
        captureType === 'photo' ? (asset.base64 ?? undefined) : undefined,
      width: asset.width,
      height: asset.height,
      durationMs: asset.duration ?? undefined,
    });
  };

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: scaleHeight(14),
      gap: scaleWidth(8),
    },
    title: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: scaleFont(18),
      fontWeight: '800',
    },
    compactButton: {
      paddingVertical: scaleHeight(6),
      paddingHorizontal: scaleWidth(10),
    },
    compactButtonText: { fontSize: scaleFont(12) },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '700',
      marginTop: scaleHeight(12),
      marginBottom: scaleHeight(8),
    },
    mediaPicker: {
      borderRadius: proportionalSize(8),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: media ? selectedLayer.color : colors.border,
      backgroundColor: colors.backgroundSecondary,
      overflow: 'hidden',
      marginBottom: scaleHeight(12),
    },
    mediaPreview: {
      width: '100%',
      height: scaleHeight(150),
      backgroundColor: '#000',
    },
    mediaPlaceholder: {
      minHeight: scaleHeight(86),
      alignItems: 'center',
      justifyContent: 'center',
      padding: proportionalSize(14),
    },
    mediaPlaceholderText: {
      color: colors.primary,
      fontSize: scaleFont(15),
      fontWeight: '800',
      textAlign: 'center',
    },
    mediaMeta: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
      fontWeight: '700',
      padding: proportionalSize(10),
    },
    input: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      color: colors.textPrimary,
      padding: proportionalSize(12),
      fontSize: scaleFont(15),
      marginBottom: scaleHeight(12),
    },
    multilineInput: {
      minHeight: scaleHeight(88),
      textAlignVertical: 'top',
    },
    placePin: {
      backgroundColor: isPinPlacementMode
        ? colors.primaryLight
        : colors.backgroundSecondary,
      padding: proportionalSize(16),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      marginVertical: scaleHeight(12),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isPinPlacementMode ? colors.primary : colors.border,
    },
    placePinText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: scaleFont(16),
    },
    coordinatesContainer: {
      backgroundColor: colors.secondaryLight,
      padding: proportionalSize(10),
      borderRadius: proportionalSize(8),
      marginBottom: scaleHeight(12),
    },
    coordinatesText: {
      color: colors.secondaryDark,
      fontSize: scaleFont(13),
      fontWeight: '700',
      textAlign: 'center',
    },
    submitButton: { marginTop: scaleHeight(8) },
  });

  return (
    <>
      <View style={s.header}>
        <Text style={s.title}>Upload Data</Text>
        <Button
          variant="danger"
          label="Close"
          onPress={onClose}
          disabled={isSubmitting}
          style={s.compactButton}
          textStyle={s.compactButtonText}
        />
      </View>

      <Text style={s.sectionTitle}>Media</Text>
      <TouchableOpacity style={s.mediaPicker} onPress={handlePickMedia}>
        {media ? (
          <>
            {media.captureType === 'photo' ? (
              <Image
                source={{ uri: media.uri }}
                style={s.mediaPreview}
                resizeMode="cover"
              />
            ) : (
              <Video
                source={{ uri: media.uri }}
                style={s.mediaPreview}
                resizeMode="cover"
                paused
                muted
              />
            )}
            <Text style={s.mediaMeta} numberOfLines={1}>
              {media.fileName ?? `${media.captureType} selected`}
            </Text>
          </>
        ) : (
          <View style={s.mediaPlaceholder}>
            <Text style={s.mediaPlaceholderText}>
              Select pre-captured photo or video
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <DropdownSelector
        title="Data Layer"
        options={uploadableLayers.map(layer => ({
          label: layer.label,
          value: layer.id,
          icon: layer.icon,
        }))}
        selectedValue={selectedLayerId}
        onValueChange={value => setSelectedLayerId(value as RipMapLayerId)}
        placeholder="Select a data layer..."
        buttonBackgroundColor={selectedLayer.color}
        buttonTextColor={colors.textInverse}
        zIndex={200}
      />

      <Text style={s.sectionTitle}>Upload Name</Text>
      <TextInput
        style={s.input}
        placeholder="e.g. Rip observation near main beach"
        placeholderTextColor={colors.textTertiary}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={s.sectionTitle}>Notes</Text>
      <TextInput
        style={[s.input, s.multilineInput]}
        placeholder="Optional details about conditions or context"
        placeholderTextColor={colors.textTertiary}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity style={s.placePin} onPress={onStartPinPlacement}>
        <Text style={s.placePinText}>
          {isPinPlacementMode
            ? 'Select Location on Map'
            : draftCoordinate
              ? 'Pin Placed - Tap to Change'
              : 'Place Pin on Map'}
        </Text>
      </TouchableOpacity>

      {draftCoordinate && (
        <View style={s.coordinatesContainer}>
          <Text style={s.coordinatesText}>
            {formatCoordinate(draftCoordinate)}
          </Text>
        </View>
      )}

      <Button
        variant="primary"
        label={submitLabel}
        onPress={async () => {
          const didSubmit = await onSubmit({
            title,
            notes,
            layerId: selectedLayerId,
            coordinate: draftCoordinate,
            media,
          });
          if (didSubmit) onClose();
        }}
        disabled={isSubmitting}
        style={s.submitButton}
      />
    </>
  );
}

export default ManualUploadSheetContent;
