/**
 * CaptureReviewScreen — review captured media with detection overlays,
 * add notes, then upload to Firebase or share locally.
 */
import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
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
  Modal,
} from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import { useColors } from '../../hooks/useColors';
import { useAuth } from '../../contexts/AuthContext';
import { saveMetadataFile, shareFile } from '../../utils/capture';
import { getCurrentLocationSnapshot } from '../../utils/location';
import { getUserFacingMessage } from '../../services/errorHandler';
import { uploadCapture } from '../../services/firebase/captures';
import type { CaptureResult } from '../../hooks/useDetectionCapture';
import ReviewDetectionOverlay from '../../components/detection/ReviewDetectionOverlay';
import type { OnLoadData } from 'react-native-video';
import DropdownSelector from '../../components/common/DropdownSelector';
import {
  canUploadToRipMapLayer,
  getUploadableRipMapLayers,
  RIP_MAP_LAYER_BY_ID,
} from '../../config/mapLayers';
import type { RipMapLayerId } from '../../types/ripMap';

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
  const { authUser, isAdmin } = useAuth();

  const [notes, setNotes] = useState('');
  const [selectedLayerId, setSelectedLayerId] =
    useState<RipMapLayerId>('public');
  const [uploading, setUploading] = useState(false);
  const [videoPlaybackMs, setVideoPlaybackMs] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [showDetectionOverlay, setShowDetectionOverlay] = useState(true);
  const [videoNaturalSize, setVideoNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const embeddedVideoRef = useRef<VideoRef>(null);
  const fullscreenVideoRef = useRef<VideoRef>(null);
  const uploadableLayers = useMemo(
    () => getUploadableRipMapLayers(isAdmin),
    [isAdmin],
  );

  useEffect(() => {
    if (!isAdmin && selectedLayerId === 'admin') {
      setSelectedLayerId('public');
    }
  }, [isAdmin, selectedLayerId]);

  const isVideo = captureResult.captureType === 'video';
  const meta = captureResult.metadata as any;
  const metadataFrames = useMemo(() => {
    if (!Array.isArray(meta?.frames)) return [];

    return [...meta.frames]
      .filter(frame => typeof frame?.elapsedMs === 'number')
      .sort((a, b) => a.elapsedMs - b.elapsedMs);
  }, [meta?.frames]);
  const sourceWidth =
    typeof meta?.screenWidth === 'number' && meta.screenWidth > 0
      ? meta.screenWidth
      : 1;
  const sourceHeight =
    typeof meta?.screenHeight === 'number' && meta.screenHeight > 0
      ? meta.screenHeight
      : 1;
  const metadataMediaWidth =
    typeof meta?.mediaWidth === 'number' && meta.mediaWidth > 0
      ? meta.mediaWidth
      : sourceWidth;
  const metadataMediaHeight =
    typeof meta?.mediaHeight === 'number' && meta.mediaHeight > 0
      ? meta.mediaHeight
      : sourceHeight;
  const mediaWidth = isVideo
    ? (videoNaturalSize?.width ?? metadataMediaWidth)
    : sourceWidth;
  const mediaHeight = isVideo
    ? (videoNaturalSize?.height ?? metadataMediaHeight)
    : sourceHeight;
  const capturedLocation = meta?.location;
  const locationLabel = capturedLocation
    ? `${capturedLocation.latitude.toFixed(6)}, ${capturedLocation.longitude.toFixed(6)}`
    : 'Pending GPS';
  const totalDetections = meta?.frames
    ? meta.frames.reduce(
        (sum: number, f: any) => sum + (f.detections?.length ?? 0),
        0,
      )
    : 0;
  const frameCount = meta?.frames?.length ?? 0;
  const durationSec = meta?.durationMs ? Math.round(meta.durationMs / 1000) : 0;

  /* ── Upload to Firebase ────────────────────────────────────────────── */

  const handleUpload = useCallback(async () => {
    if (!authUser) {
      Alert.alert('Not Signed In', 'You must be signed in to upload captures.');
      return;
    }
    if (!canUploadToRipMapLayer(selectedLayerId, isAdmin)) {
      Alert.alert(
        'Admin Access Required',
        'Only administrators can upload to the Admin layer.',
      );
      return;
    }

    setUploading(true);
    try {
      const location = meta?.location ?? (await getCurrentLocationSnapshot());

      if (!location) {
        Alert.alert(
          'GPS Location Required',
          'Allow location access so this capture can be uploaded with GPS coordinates.',
        );
        return;
      }

      const trimmedNotes = notes.trim();
      const metadata = {
        ...meta,
        location,
        layerId: selectedLayerId,
        notes: trimmedNotes,
      };
      const metadataUri = await saveMetadataFile(
        captureResult.sessionId,
        metadata,
      );

      const result = await uploadCapture({
        userId: authUser.uid,
        sessionId: captureResult.sessionId,
        mediaUri: captureResult.mediaUri,
        metadataUri,
        captureType: captureResult.captureType,
        layerId: selectedLayerId,
        notes: trimmedNotes,
        location,
      });

      Alert.alert(
        'Upload Complete',
        `Capture uploaded successfully.\nID: ${result.firestoreId}`,
        [{ text: 'OK', onPress: onBack }],
      );
    } catch (e: any) {
      Alert.alert(
        'Upload Failed',
        getUserFacingMessage(
          e,
          'Could not upload this capture. Check your connection and try again.',
        ),
      );
    } finally {
      setUploading(false);
    }
  }, [authUser, captureResult, isAdmin, meta, notes, onBack, selectedLayerId]);

  /* ── Share locally ─────────────────────────────────────────────────── */

  const handleShareMedia = useCallback(async () => {
    try {
      await shareFile(captureResult.mediaUri);
    } catch (error) {
      Alert.alert(
        'Share Failed',
        getUserFacingMessage(error, 'Could not share this capture.'),
      );
    }
  }, [captureResult.mediaUri]);

  const handleShareMetadata = useCallback(async () => {
    try {
      await shareFile(captureResult.metadataUri);
    } catch (error) {
      Alert.alert(
        'Share Failed',
        getUserFacingMessage(error, 'Could not share the capture metadata.'),
      );
    }
  }, [captureResult.metadataUri]);

  const handlePreviewError = useCallback((_error: unknown) => {
    Alert.alert(
      'Preview Unavailable',
      'This capture could not be played or displayed on this device.',
    );
  }, []);

  const handleVideoProgress = useCallback(
    ({ currentTime }: { currentTime: number }) => {
      setVideoPlaybackMs(currentTime * 1000);
    },
    [],
  );

  const handleVideoLoad = useCallback((event: OnLoadData) => {
    const { width, height } = event.naturalSize;
    if (width > 0 && height > 0) {
      setVideoNaturalSize({ width, height });
    }
  }, []);

  const videoControlsStyles = useMemo(() => ({ hideFullscreen: true }), []);
  const overlayToggleLabel = showDetectionOverlay
    ? 'Hide Overlay'
    : 'Show Overlay';

  const toggleDetectionOverlay = useCallback(() => {
    setShowDetectionOverlay(current => !current);
  }, []);

  const openPreviewFullscreen = useCallback(() => {
    setPreviewFullscreen(true);
  }, []);

  const closePreviewFullscreen = useCallback(() => {
    setPreviewFullscreen(false);
    if (isVideo) {
      embeddedVideoRef.current?.seek(videoPlaybackMs / 1000);
    }
  }, [isVideo, videoPlaybackMs]);

  const handleFullscreenVideoLoad = useCallback(() => {
    if (isVideo && videoPlaybackMs > 0) {
      fullscreenVideoRef.current?.seek(videoPlaybackMs / 1000);
    }
  }, [isVideo, videoPlaybackMs]);

  /* ── Styles ────────────────────────────────────────────────────────── */

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.borderLight,
    },
    text: { color: colors.textPrimary },
    textSec: { color: colors.textSecondary },
    textTer: { color: colors.textTertiary },
    input: {
      backgroundColor: colors.backgroundTertiary,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnSecondary: {
      backgroundColor: colors.backgroundTertiary,
      borderColor: colors.border,
    },
  };
  const selectedLayer = RIP_MAP_LAYER_BY_ID[selectedLayerId];

  return (
    <KeyboardAvoidingView
      style={[styles.root, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>
            Back
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
            Review Your Capture
          </Text>
          <Text style={[styles.cardBody, dynamicStyles.textSec]}>
            Preview your {isVideo ? 'video' : 'photo'} below. Add optional
            notes, then upload to the research database or share the files
            directly.
          </Text>
        </View>

        {/* Media preview */}
        <View style={[styles.mediaContainer, dynamicStyles.card]}>
          {isVideo ? (
            <Video
              ref={embeddedVideoRef}
              source={{ uri: captureResult.mediaUri }}
              style={styles.media}
              controls
              controlsStyles={videoControlsStyles}
              resizeMode="contain"
              paused={previewFullscreen}
              repeat
              progressUpdateInterval={100}
              onProgress={handleVideoProgress}
              onLoad={handleVideoLoad}
              onError={handlePreviewError}
            />
          ) : (
            <Image
              source={{ uri: captureResult.mediaUri }}
              style={styles.media}
              resizeMode="contain"
              onError={handlePreviewError}
            />
          )}
          <ReviewDetectionOverlay
            frames={metadataFrames}
            sourceWidth={sourceWidth}
            sourceHeight={sourceHeight}
            mediaWidth={mediaWidth}
            mediaHeight={mediaHeight}
            currentMs={isVideo ? videoPlaybackMs : 0}
            isVideo={isVideo}
            visible={showDetectionOverlay}
          />
          <View style={styles.previewControls}>
            <TouchableOpacity
              style={styles.previewControlButton}
              onPress={toggleDetectionOverlay}
              accessibilityLabel={overlayToggleLabel}
              accessibilityRole="button"
            >
              <Text style={styles.fullscreenButtonText}>
                {overlayToggleLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewControlButton}
              onPress={openPreviewFullscreen}
              accessibilityLabel="Open fullscreen preview"
              accessibilityRole="button"
            >
              <Text style={styles.fullscreenButtonText}>Fullscreen</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={previewFullscreen}
          animationType="fade"
          supportedOrientations={[
            'portrait',
            'landscape',
            'landscape-left',
            'landscape-right',
          ]}
          onRequestClose={closePreviewFullscreen}
        >
          <View style={styles.fullscreenRoot}>
            {isVideo ? (
              <Video
                ref={fullscreenVideoRef}
                source={{ uri: captureResult.mediaUri }}
                style={StyleSheet.absoluteFill}
                controls
                controlsStyles={videoControlsStyles}
                resizeMode="contain"
                paused={!previewFullscreen}
                repeat
                progressUpdateInterval={100}
                onProgress={handleVideoProgress}
                onLoad={event => {
                  handleVideoLoad(event);
                  handleFullscreenVideoLoad();
                }}
                onError={handlePreviewError}
              />
            ) : (
              <Image
                source={{ uri: captureResult.mediaUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
                onError={handlePreviewError}
              />
            )}
            <ReviewDetectionOverlay
              frames={metadataFrames}
              sourceWidth={sourceWidth}
              sourceHeight={sourceHeight}
              mediaWidth={mediaWidth}
              mediaHeight={mediaHeight}
              currentMs={isVideo ? videoPlaybackMs : 0}
              isVideo={isVideo}
              visible={showDetectionOverlay}
            />
            <View style={styles.fullscreenControls}>
              <TouchableOpacity
                style={styles.previewControlButton}
                onPress={toggleDetectionOverlay}
                accessibilityLabel={overlayToggleLabel}
                accessibilityRole="button"
              >
                <Text style={styles.fullscreenButtonText}>
                  {overlayToggleLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewControlButton}
                onPress={closePreviewFullscreen}
                accessibilityLabel="Close fullscreen preview"
                accessibilityRole="button"
              >
                <Text style={styles.fullscreenButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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

        <View style={[styles.locationCard, dynamicStyles.card]}>
          <Text style={[styles.locationLabel, dynamicStyles.textTer]}>
            GPS Location
          </Text>
          <Text style={[styles.locationValue, dynamicStyles.text]}>
            {locationLabel}
          </Text>
        </View>

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

        {/* Notes input */}
        <Text style={[styles.label, dynamicStyles.text]}>Notes (optional)</Text>
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
            style={[
              styles.btn,
              dynamicStyles.btnPrimary,
              uploading && styles.btnDisabled,
            ]}
            onPress={handleUpload}
            disabled={uploading}
            accessibilityLabel="Upload to Firebase"
            accessibilityRole="button"
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnTextLight}>Upload to Database</Text>
            )}
          </TouchableOpacity>

          {/* Share media */}
          <TouchableOpacity
            style={[styles.btn, styles.btnBorder, dynamicStyles.btnSecondary]}
            onPress={handleShareMedia}
            disabled={uploading}
            accessibilityLabel={`Share ${isVideo ? 'video' : 'photo'}`}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, dynamicStyles.text]}>
              Share {isVideo ? 'Video' : 'Photo'}
            </Text>
          </TouchableOpacity>

          {/* Share metadata */}
          <TouchableOpacity
            style={[styles.btn, styles.btnBorder, dynamicStyles.btnSecondary]}
            onPress={handleShareMetadata}
            disabled={uploading}
            accessibilityLabel="Share metadata JSON"
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, dynamicStyles.text]}>
              Share Metadata JSON
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
            <Text style={styles.btnTextLight}>Recapture</Text>
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
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  media: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
  },
  previewControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    gap: 8,
  },
  previewControlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fullscreenButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenControls: {
    position: 'absolute',
    right: 16,
    top: 52,
    flexDirection: 'row',
    gap: 8,
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
  locationCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  locationValue: {
    fontSize: 15,
    fontWeight: '600',
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
  btnBorder: {
    borderWidth: 1,
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
