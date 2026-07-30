import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Video, { type OnLoadData, type VideoRef } from 'react-native-video';
import { useColors } from '../../hooks/useColors';
import type {
  CaptureMetadata,
  DetectionMetadataFrame,
  DetectionMetadataRecord,
} from '../../types/media';
import ReviewDetectionOverlay from './ReviewDetectionOverlay';

interface CaptureMediaPreviewProps {
  mediaUri: string;
  captureType: 'photo' | 'video';
  metadata?: CaptureMetadata | null;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isFinitePositiveNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value > 0;

const isDetectionRecord = (
  value: unknown,
): value is DetectionMetadataRecord => {
  if (!value || typeof value !== 'object') return false;

  const detection = value as {
    className?: unknown;
    confidence?: unknown;
    bbox?: unknown;
  };

  return (
    typeof detection.className === 'string' &&
    typeof detection.confidence === 'number' &&
    Number.isFinite(detection.confidence) &&
    Array.isArray(detection.bbox) &&
    detection.bbox.length === 4 &&
    detection.bbox.every(
      coordinate =>
        typeof coordinate === 'number' && Number.isFinite(coordinate),
    )
  );
};

const normalizeFrames = (
  frames: CaptureMetadata['frames'],
): DetectionMetadataFrame[] => {
  if (!Array.isArray(frames)) return [];

  return frames
    .flatMap(frame => {
      if (!frame || !isFiniteNumber(frame.elapsedMs)) return [];
      return [
        {
          elapsedMs: frame.elapsedMs,
          detections: Array.isArray(frame.detections)
            ? frame.detections.filter(isDetectionRecord)
            : [],
        },
      ];
    })
    .sort((first, second) => first.elapsedMs - second.elapsedMs);
};

export default function CaptureMediaPreview({
  mediaUri,
  captureType,
  metadata,
}: CaptureMediaPreviewProps) {
  const colors = useColors();
  const isVideo = captureType === 'video';
  const [videoPlaybackMs, setVideoPlaybackMs] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [showDetectionOverlay, setShowDetectionOverlay] = useState(true);
  const [videoNaturalSize, setVideoNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const embeddedVideoRef = useRef<VideoRef>(null);
  const fullscreenVideoRef = useRef<VideoRef>(null);

  useEffect(() => {
    setVideoPlaybackMs(0);
    setPreviewFullscreen(false);
    setShowDetectionOverlay(true);
    setVideoNaturalSize(null);
  }, [mediaUri]);

  const metadataFrames = useMemo(
    () => normalizeFrames(metadata?.frames),
    [metadata?.frames],
  );
  const sourceWidth = isFinitePositiveNumber(metadata?.screenWidth)
    ? metadata.screenWidth
    : isFinitePositiveNumber(metadata?.mediaWidth)
      ? metadata.mediaWidth
      : 1;
  const sourceHeight = isFinitePositiveNumber(metadata?.screenHeight)
    ? metadata.screenHeight
    : isFinitePositiveNumber(metadata?.mediaHeight)
      ? metadata.mediaHeight
      : 1;
  const metadataMediaWidth = isFinitePositiveNumber(metadata?.mediaWidth)
    ? metadata.mediaWidth
    : sourceWidth;
  const metadataMediaHeight = isFinitePositiveNumber(metadata?.mediaHeight)
    ? metadata.mediaHeight
    : sourceHeight;
  const mediaWidth = isVideo
    ? (videoNaturalSize?.width ?? metadataMediaWidth)
    : sourceWidth;
  const mediaHeight = isVideo
    ? (videoNaturalSize?.height ?? metadataMediaHeight)
    : sourceHeight;

  const handlePreviewError = useCallback(() => {
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

  const renderMedia = (fullscreen: boolean) =>
    isVideo ? (
      <Video
        ref={fullscreen ? fullscreenVideoRef : embeddedVideoRef}
        source={{ uri: mediaUri }}
        style={fullscreen ? StyleSheet.absoluteFill : styles.media}
        controls
        controlsStyles={videoControlsStyles}
        resizeMode="contain"
        paused={fullscreen ? !previewFullscreen : previewFullscreen}
        repeat
        progressUpdateInterval={100}
        onProgress={handleVideoProgress}
        onLoad={
          fullscreen
            ? event => {
                handleVideoLoad(event);
                handleFullscreenVideoLoad();
              }
            : handleVideoLoad
        }
        onError={handlePreviewError}
      />
    ) : (
      <Image
        source={{ uri: mediaUri }}
        style={fullscreen ? StyleSheet.absoluteFill : styles.media}
        resizeMode="contain"
        onError={handlePreviewError}
      />
    );

  return (
    <>
      <View
        style={[
          styles.mediaContainer,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.borderLight,
          },
        ]}
      >
        {renderMedia(false)}
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
          {renderMedia(true)}
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
    </>
  );
}

const styles = StyleSheet.create({
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
});
