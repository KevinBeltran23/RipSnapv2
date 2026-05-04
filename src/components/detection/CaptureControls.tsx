/**
 * CaptureControls — shutter + record buttons overlaid on the camera feed.
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface Props {
  captureMode: string;
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
  const isRecording = captureMode === 'recording';

  return (
    <View style={s.wrap} pointerEvents="box-none">
      {/* Recording timer */}
      {isRecording && (
        <View style={s.timer}>
          <View style={s.dot} />
          <Text style={s.timerText}>
            {pad2(Math.floor(recordingSeconds / 60))}:{pad2(recordingSeconds % 60)}
          </Text>
        </View>
      )}

      <View style={s.row}>
        {/* Record / Stop */}
        <TouchableOpacity
          style={s.side}
          onPress={isRecording ? onRecordStop : onRecordStart}
          disabled={isProcessing}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
        >
          <View style={[s.recBtn, isRecording && s.recBtnActive]} />
          <Text style={s.label}>{isRecording ? 'Stop' : 'Record'}</Text>
        </TouchableOpacity>

        {/* Shutter (photo) */}
        <TouchableOpacity
          style={[s.shutter, isRecording && s.shutterDisabled]}
          onPress={onPhoto}
          disabled={isProcessing || isRecording}
          accessibilityLabel="Take photo"
          accessibilityRole="button"
        >
          {isProcessing ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <View style={s.shutterInner} />
          )}
        </TouchableOpacity>

        {/* Spacer to balance layout */}
        <View style={s.side} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 44,
    paddingTop: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginRight: 7,
  },
  timerText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
  },
  side: {
    width: 56,
    alignItems: 'center',
    gap: 4,
  },
  recBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
  },
  recBtnActive: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  shutter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});
