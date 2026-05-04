/**
 * CaptureControls — iOS-style capture bar with swipeable Photo/Video mode
 * selector and a single adaptive shutter button.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Mode = 'photo' | 'video';

interface Props {
  captureMode: string; // 'idle' | 'photo' | 'recording'
  isProcessing: boolean;
  recordingSeconds: number;
  onPhoto: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export default function CaptureControls({
  captureMode,
  isProcessing,
  recordingSeconds,
  onPhoto,
  onRecordStart,
  onRecordStop,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectedMode, setSelectedMode] = useState<Mode>('photo');
  const isRecording = captureMode === 'recording';
  const isIdle = captureMode === 'idle';

  // Swipe gesture to switch modes
  const panX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dy) < 30,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          setSelectedMode('video');
        } else if (g.dx > 40) {
          setSelectedMode('photo');
        }
      },
    }),
  ).current;

  const handleShutter = useCallback(() => {
    if (isProcessing) return;
    if (selectedMode === 'photo') {
      if (isIdle) onPhoto();
    } else {
      if (isRecording) {
        onRecordStop();
      } else if (isIdle) {
        onRecordStart();
      }
    }
  }, [selectedMode, isIdle, isRecording, isProcessing, onPhoto, onRecordStart, onRecordStop]);

  const isVideoMode = selectedMode === 'video';

  return (
    <View
      style={[s.wrap, { paddingBottom: Math.max(insets.bottom) + 4 }]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      {/* Recording timer */}
      {isRecording && (
        <View style={s.timer}>
          <View style={s.dot} />
          <Text style={s.timerText}>
            {pad2(Math.floor(recordingSeconds / 60))}:
            {pad2(recordingSeconds % 60)}
          </Text>
        </View>
      )}

      {/* Shutter button */}
      <View style={s.shutterRow}>
        <TouchableOpacity
          style={[s.shutter, isVideoMode && !isRecording && s.shutterVideo]}
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
            /* Stop icon — red rounded square */
            <View style={s.stopIcon} />
          ) : isVideoMode ? (
            /* Red circle for video idle */
            <View style={s.shutterInnerVideo} />
          ) : (
            /* White circle for photo */
            <View style={s.shutterInnerPhoto} />
          )}
        </TouchableOpacity>
      </View>

      {/* Mode selector — swipeable labels */}
      {!isRecording && (
        <View style={s.modeRow}>
          <TouchableOpacity
            onPress={() => setSelectedMode('photo')}
            style={s.modeBtn}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedMode === 'photo' }}
          >
            <Text
              style={[
                s.modeLabel,
                selectedMode === 'photo' && s.modeLabelActive,
              ]}
            >
              PHOTO
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedMode('video')}
            style={s.modeBtn}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedMode === 'video' }}
          >
            <Text
              style={[
                s.modeLabel,
                selectedMode === 'video' && s.modeLabelActive,
              ]}
            >
              VIDEO
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Swipe hint */}
      {!isRecording && (
        <Text style={s.hint}>Swipe to switch mode</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
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
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  shutterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterVideo: {
    borderColor: '#FF3B30',
  },
  shutterInnerPhoto: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  shutterInnerVideo: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FF3B30',
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 6,
  },
  modeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modeLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
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
