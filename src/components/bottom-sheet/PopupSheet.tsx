import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../common/Button';
import UploadedCaptureSheetContent from './UploadedCaptureSheetContent';
import { RIP_MAP_LAYER_BY_ID } from '../../config/mapLayers';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { getUserFacingMessage } from '../../services/errorHandler';
import type { RipCoordinate, RipMapPoint } from '../../types/ripMap';

interface PopupSheetProps {
  mode: 'view' | 'add';
  point?: RipMapPoint | null;
  draftCoordinate: RipCoordinate | null;
  isPinPlacementMode: boolean;
  isSubmitting: boolean;
  closeLabel?: string;
  onClose: () => void;
  onAddPress: () => void;
  onStartPinPlacement: () => void;
  onSubmit?: (draft: { title: string; notes: string }) => Promise<boolean>;
}

const formatDisplayDate = (createdAt?: string) => {
  if (!createdAt) return 'Unknown time';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString();
};

const formatCoordinate = (coordinate: RipCoordinate) =>
  `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;

function PopupSheet({
  mode,
  point,
  draftCoordinate,
  isPinPlacementMode,
  isSubmitting,
  closeLabel = 'Close',
  onClose,
  onAddPress,
  onStartPinPlacement,
  onSubmit,
}: PopupSheetProps) {
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (mode === 'add') {
      setTitle('');
      setNotes('');
    }
  }, [mode]);

  const handleOpenMaps = async () => {
    if (!point) return;
    const { latitude, longitude } = point.coordinate;
    try {
      await Linking.openURL(
        `https://maps.google.com/?q=${latitude},${longitude}`,
      );
    } catch (error) {
      Alert.alert(
        'Could Not Open Maps',
        getUserFacingMessage(
          error,
          'No map application is available right now.',
        ),
      );
    }
  };

  const submitLabel = isSubmitting ? 'Saving...' : 'Submit Upload';

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
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleWidth(6),
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
    detailText: {
      color: colors.textPrimary,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
      marginBottom: scaleHeight(6),
    },
    label: {
      color: colors.textTertiary,
      fontSize: scaleFont(11),
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: scaleHeight(3),
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
      {mode === 'view' && point && (
        <>
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1}>
              {point.title}
            </Text>
            <View style={s.headerButtons}>
              <Button
                variant="secondary"
                label="Add"
                onPress={onAddPress}
                style={s.compactButton}
                textStyle={s.compactButtonText}
              />
              <Button
                variant="primary"
                label="Maps"
                onPress={handleOpenMaps}
                style={s.compactButton}
                textStyle={s.compactButtonText}
              />
              <Button
                variant="danger"
                label={closeLabel}
                onPress={onClose}
                style={s.compactButton}
                textStyle={s.compactButtonText}
              />
            </View>
          </View>

          {(point.media?.url || point.media?.metadataUrl) && (
            <UploadedCaptureSheetContent point={point} />
          )}

          <Text style={s.label}>Layer</Text>
          <Text style={s.detailText}>
            {RIP_MAP_LAYER_BY_ID[point.layerId].label}
          </Text>
          <Text style={s.label}>Captured</Text>
          <Text style={s.detailText}>{formatDisplayDate(point.createdAt)}</Text>
          <Text style={s.label}>Coordinates</Text>
          <Text style={s.detailText}>{formatCoordinate(point.coordinate)}</Text>
          <Text style={s.label}>Capture type</Text>
          <Text style={s.detailText}>{point.captureType}</Text>
          <Text style={s.label}>Notes</Text>
          <Text style={s.detailText}>{point.notes ?? 'No notes'}</Text>
        </>
      )}

      {mode === 'add' && (
        <>
          <View style={s.header}>
            <Text style={s.title}>Add Map Upload</Text>
            <Button
              variant="danger"
              label="Close"
              onPress={onClose}
              style={s.compactButton}
              textStyle={s.compactButtonText}
            />
          </View>

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
              if (!onSubmit) return;
              const didSubmit = await onSubmit({ title, notes });
              if (didSubmit) onClose();
            }}
            disabled={isSubmitting}
            style={s.submitButton}
          />
        </>
      )}
    </>
  );
}

export default PopupSheet;
