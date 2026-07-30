import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type DetectionRecord = {
  className: string;
  confidence: number;
  bbox: [number, number, number, number];
};

type DetectionFrame = {
  elapsedMs: number;
  detections?: DetectionRecord[];
};

interface ReviewDetectionOverlayProps {
  frames: DetectionFrame[];
  sourceWidth: number;
  sourceHeight: number;
  mediaWidth: number;
  mediaHeight: number;
  currentMs: number;
  isVideo: boolean;
  visible?: boolean;
}

const MAX_VIDEO_DETECTION_AGE_MS = 500;

function getActiveFrame(
  frames: DetectionFrame[],
  currentMs: number,
  isVideo: boolean,
): DetectionFrame | null {
  if (frames.length === 0) return null;
  if (!isVideo) return frames[0];

  let activeFrame: DetectionFrame | null = null;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].elapsedMs <= currentMs) {
      activeFrame = frames[i];
    } else {
      break;
    }
  }

  if (
    activeFrame == null ||
    currentMs - activeFrame.elapsedMs > MAX_VIDEO_DETECTION_AGE_MS
  ) {
    return null;
  }

  return activeFrame;
}

export default function ReviewDetectionOverlay({
  frames,
  sourceWidth,
  sourceHeight,
  mediaWidth,
  mediaHeight,
  currentMs,
  isVideo,
  visible = true,
}: ReviewDetectionOverlayProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const overlayBoxes = useMemo(() => {
    if (
      layout.width <= 0 ||
      layout.height <= 0 ||
      sourceWidth <= 0 ||
      sourceHeight <= 0 ||
      mediaWidth <= 0 ||
      mediaHeight <= 0 ||
      !visible
    ) {
      return [];
    }

    const activeFrame = getActiveFrame(frames, currentMs, isVideo);
    const detections = activeFrame?.detections ?? [];
    if (detections.length === 0) return [];

    const mediaAspect = mediaWidth / mediaHeight;
    const layoutAspect = layout.width / layout.height;
    const contentWidth =
      mediaAspect > layoutAspect ? layout.width : layout.height * mediaAspect;
    const contentHeight =
      mediaAspect > layoutAspect ? layout.width / mediaAspect : layout.height;
    const offsetX = (layout.width - contentWidth) / 2;
    const offsetY = (layout.height - contentHeight) / 2;
    const scaleX = contentWidth / sourceWidth;
    const scaleY = contentHeight / sourceHeight;

    return detections.map((detection, index) => {
      const [x, y, width, height] = detection.bbox;
      const boxStyle: ViewStyle = {
        left: offsetX + x * scaleX,
        top: offsetY + y * scaleY,
        width: Math.max(1, width * scaleX),
        height: Math.max(1, height * scaleY),
      };

      return {
        id: `${index}-${detection.className}-${detection.confidence}`,
        label: `${detection.className} ${(detection.confidence * 100).toFixed(0)}%`,
        boxStyle,
      };
    });
  }, [
    currentMs,
    frames,
    isVideo,
    layout,
    mediaHeight,
    mediaWidth,
    sourceHeight,
    sourceWidth,
    visible,
  ]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={handleLayout}
      pointerEvents="none"
    >
      {overlayBoxes.map(box => (
        <View key={box.id} style={[styles.box, box.boxStyle]}>
          <View style={styles.label}>
            <Text style={styles.labelText} numberOfLines={1}>
              {box.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FF00FF',
  },
  label: {
    position: 'absolute',
    left: -2,
    top: -22,
    maxWidth: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
