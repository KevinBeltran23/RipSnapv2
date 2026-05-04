/**
 * CaptureReviewScreen — review captured media with detection overlays,
 * add notes and location, then upload to Firebase or share locally.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import { useColors } from '../../hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { shareFile } from '../../utils/capture';
import { uploadCapture } from '../../services/firebase/captures';
import type { CaptureResult } from '../../hooks/useDetectionCapture';

interface Props {
  captureResult: CaptureResult;
  onBack: () => void;
  onRecapture: () => void;
}

export default function CaptureReviewScreen({
  captureResult,
  onBack,
  onRecapture,
}: Props) {
  const colors = useColors();
  const { authUser } = useAuth();

  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('');
  const [uploading, setUploading] = useState(false);

  const isVideo = captureResult.captureType === 'video';
  const meta = captureResult.metadata as any;
  const totalDetections = meta?.frames
    ? meta.frames.reduce(
        (sum: number, f: any) => sum + (f.detections?.length ?? 0),
        0,
      )
    : 0;
  const frameCount = meta?.frames?.length ?? 0;
  const durationSec = meta?.durationMs
    ? Math.round(meta.durationMs / 1000)
    : 0;

  /* ── Upload to Firebase ────────────────────────────────────────────── */

  const handleUpload = useCallback(async () => {
    if (!authUser) {
      Alert.alert('Not Signed In', 'You must be signed in to upload captures.');
      return;
    }
    if (!locationName.trim()) {
      Alert.alert('Location Required', 'Please enter a location name for this capture.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadCapture({
        userId: authUser.uid,
        sessionId: captureResult.sessionId,
        mediaUri: captureResult.mediaUri,
        metadataUri: captureResult.metadataUri,
        captureType: captureResult.captureType,
        notes,
        locationName,
      });

      Alert.alert(
        'Upload Complete',
        `Capture uploaded successfully.\nID: ${result.firestoreId}`,
        [{ text: 'OK', onPress: onBack }],
      );
    } catch (e: any) {
      console.error('Upload failed:', e);
      Alert.alert('Upload Failed', e?.message ?? 'Could not upload capture.');
    } finally {
      setUploading(false);
    }
  }, [authUser, captureResult, notes, locationName, onBack]);

  /* ── Share locally ─────────────────────────────────────────────────── */

  const handleShareMedia = useCallback(() => {
    shareFile(captureResult.mediaUri);
  }, [captureResult.mediaUri]);

  const handleShareMetadata = useCallback(() => {
    shareFile(captureResult.metadataUri);
  }, [captureResult.metadataUri]);

  /* ── Styles ────────────────────────────────────────────────────────── */

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight },
    text: { color: colors.textPrimary },
    textSec: { color: colors.textSecondary },
    textTer: { color: colors.textTertiary },
    input: {
      backgroundColor: colors.backgroundTertiary,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnSecondary: { backgroundColor: colors.backgroundTertiary, borderColor: colors.border },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Review Capture
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Instructions */}
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.cardTitle, dynamicStyles.text]}>
            📋 Review Your Capture
          </Text>
          <Text style={[styles.cardBody, dynamicStyles.textSec]}>
            Preview your {isVideo ? 'video' : 'photo'} below. Add a location
            name and optional notes, then upload to the research database or
            share the files directly.
          </Text>
        </View>

        {/* Media preview */}
        <View style={[styles.mediaContainer, dynamicStyles.card]}>
          {isVideo ? (
            <Video
              source={{ uri: captureResult.mediaUri }}
              style={styles.media}
              controls
              resizeMode="contain"
              paused={false}
              repeat
            />
          ) : (
            <Image
              source={{ uri: captureResult.mediaUri }}
              style={styles.media}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Stats */}
        <View style={[styles.statsRow]}>
          <View style={[styles.statPill, dynamicStyles.card]}>
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {isVideo ? `${durationSec}s` : '1'}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textTer]}>
              {isVideo ? 'Duration' : 'Frame'}
            </Text>
          </View>
          <View style={[styles.statPill, dynamicStyles.card]}>
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {frameCount}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textTer]}>
              Annotated
            </Text>
          </View>
          <View style={[styles.statPill, dynamicStyles.card]}>
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {totalDetections}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textTer]}>
              Detections
            </Text>
          </View>
        </View>

        {/* Location input */}
        <Text style={[styles.label, dynamicStyles.text]}>
          Location *
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          placeholder="e.g. Main St & 5th Ave, Santa Cruz"
          placeholderTextColor={colors.textTertiary}
          value={locationName}
          onChangeText={setLocationName}
          returnKeyType="next"
        />

        {/* Notes input */}
        <Text style={[styles.label, dynamicStyles.text]}>
          Notes (optional)
        </Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, dynamicStyles.input]}
          placeholder="Any observations about conditions, time of day, etc."
          placeholderTextColor={colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Upload */}
          <TouchableOpacity
            style={[styles.btn, dynamicStyles.btnPrimary, uploading && styles.btnDisabled]}
            onPress={handleUpload}
            disabled={uploading}
            accessibilityLabel="Upload to Firebase"
            accessibilityRole="button"
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnTextLight}>☁ Upload to Database</Text>
            )}
          </TouchableOpacity>

          {/* Share media */}
          <TouchableOpacity
            style={[styles.btn, dynamicStyles.btnSecondary, { borderWidth: 1 }]}
            onPress={handleShareMedia}
            disabled={uploading}
            accessibilityLabel={`Share ${isVideo ? 'video' : 'photo'}`}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, dynamicStyles.text]}>
              ↗ Share {isVideo ? 'Video' : 'Photo'}
            </Text>
          </TouchableOpacity>

          {/* Share metadata */}
          <TouchableOpacity
            style={[styles.btn, dynamicStyles.btnSecondary, { borderWidth: 1 }]}
            onPress={handleShareMetadata}
            disabled={uploading}
            accessibilityLabel="Share metadata JSON"
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, dynamicStyles.text]}>
              ↗ Share Metadata JSON
            </Text>
          </TouchableOpacity>

          {/* Recapture */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.error }]}
            onPress={onRecapture}
            disabled={uploading}
            accessibilityLabel="Recapture"
            accessibilityRole="button"
          >
            <Text style={styles.btnTextLight}>⟲ Recapture</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 70,
  },
  headerBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 14,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  media: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnTextLight: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
