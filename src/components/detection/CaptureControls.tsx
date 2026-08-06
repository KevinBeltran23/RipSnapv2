/**
 * CaptureControls - responsive photo/video controls.
 * Portrait uses a compact bottom bar; landscape uses a right-side rail.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Mode = 'photo' | 'video';

interface Props {
  captureMode: string; // 'idle' | 'photo' | 'recording'
  isProcessing: boolean;
  recordingSeconds: number;
  videoEnabled?: boolean;
  onPhoto: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
  onVideoUnavailable?: () => void;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export default function CaptureControls({
  captureMode,
  isProcessing,
  recordingSeconds,
  videoEnabled = true,
  onPhoto,
  onRecordStart,
  onRecordStop,
  onVideoUnavailable,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [selectedMode, setSelectedMode] = useState<Mode>('photo');

  const isRecording = captureMode === 'recording';
  const isIdle = captureMode === 'idle';
  const isLandscape = width > height;
  const activeMode = videoEnabled ? selectedMode : 'photo';
  const isVideoMode = activeMode === 'video';
  const safeAreaStyle = isLandscape
    ? {
        right: Math.max(insets.right, 8),
      }
    : {
        bottom: Math.max(insets.bottom, 8),
      };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 15,
      onPanResponderRelease: (_, gesture) => {
        const movement =
          Math.abs(gesture.dx) > Math.abs(gesture.dy)
            ? gesture.dx
            : -gesture.dy;

        if (movement < -40) {
          setSelectedMode('video');
        } else if (movement > 40) {
          setSelectedMode('photo');
        }
      },
    }),
  ).current;

  const handleShutter = useCallback(() => {
    if (isProcessing) return;

    if (activeMode === 'photo') {
      if (isIdle) onPhoto();
      return;
    }

    if (!videoEnabled) {
      onVideoUnavailable?.();
      return;
    }

    if (isRecording) {
      onRecordStop();
    } else if (isIdle) {
      onRecordStart();
    }
  }, [
    activeMode,
    isIdle,
    isRecording,
    isProcessing,
    videoEnabled,
    onPhoto,
    onRecordStart,
    onRecordStop,
    onVideoUnavailable,
  ]);

  const selectVideoMode = useCallback(() => {
    if (!videoEnabled) {
      onVideoUnavailable?.();
      return;
    }
    setSelectedMode('video');
  }, [onVideoUnavailable, videoEnabled]);

  return (
    <View
      style={[
        styles.wrap,
        isLandscape ? styles.wrapLandscape : styles.wrapPortrait,
        safeAreaStyle,
      ]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      {isRecording && (
        <View style={[styles.timer, isLandscape && styles.timerLandscape]}>
          <View style={styles.dot} />
          <Text style={styles.timerText}>
            {pad2(Math.floor(recordingSeconds / 60))}:
            {pad2(recordingSeconds % 60)}
          </Text>
        </View>
      )}

      <View
        style={[styles.shutterRow, isLandscape && styles.shutterRowLandscape]}
      >
        <TouchableOpacity
          style={[
            styles.shutter,
            isLandscape && styles.shutterLandscape,
            isVideoMode && !isRecording && styles.shutterVideo,
          ]}
          onPress={handleShutter}
          disabled={isProcessing}
          activeOpacity={0.7}
          accessibilityLabel={
            isVideoMode
              ? isRecording
                ? 'Stop recording'
                : 'Start recording'
              : 'Take photo'
          }
          accessibilityRole="button"
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : isVideoMode && isRecording ? (
            <View style={styles.stopIcon} />
          ) : isVideoMode ? (
            <View
              style={[
                styles.shutterInnerVideo,
                isLandscape && styles.shutterInnerLandscape,
              ]}
            />
          ) : (
            <View
              style={[
                styles.shutterInnerPhoto,
                isLandscape && styles.shutterInnerLandscape,
              ]}
            />
          )}
        </TouchableOpacity>
      </View>

      {!isRecording && (
        <View style={[styles.modeRow, isLandscape && styles.modeRowLandscape]}>
          <TouchableOpacity
            onPress={() => setSelectedMode('photo')}
            style={styles.modeBtn}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedMode === 'photo' }}
          >
            <Text
              style={[
                styles.modeLabel,
                selectedMode === 'photo' && styles.modeLabelActive,
              ]}
            >
              PHOTO
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={selectVideoMode}
            style={[styles.modeBtn, !videoEnabled && styles.modeBtnDisabled]}
            accessibilityRole="tab"
            accessibilityState={{
              selected: selectedMode === 'video',
              disabled: !videoEnabled,
            }}
          >
            <Text
              style={[
                styles.modeLabel,
                selectedMode === 'video' && styles.modeLabelActive,
              ]}
            >
              VIDEO
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isRecording && !isLandscape && (
        <Text style={styles.hint}>Swipe to switch mode</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  wrapPortrait: {
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -80 }],
    width: 160,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  wrapLandscape: {
    top: '50%',
    transform: [{ translateY: -92 }],
    width: 92,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 18,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 18,
  },
  timerLandscape: {
    paddingHorizontal: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  shutterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shutterRowLandscape: {
    marginBottom: 8,
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterLandscape: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  shutterVideo: {
    borderColor: '#FF3B30',
  },
  shutterInnerPhoto: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  shutterInnerVideo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF3B30',
  },
  shutterInnerLandscape: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 2,
  },
  modeRowLandscape: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 0,
  },
  modeBtn: {
    minWidth: 58,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  modeBtnDisabled: {
    opacity: 0.45,
  },
  modeLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  modeLabelActive: {
    color: '#FFD60A',
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    marginTop: 2,
  },
});
