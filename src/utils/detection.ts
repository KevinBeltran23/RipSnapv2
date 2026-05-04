/**
 * YOLO detection utilities: bounding-box NMS + output parsing.
 * These functions run inside Vision Camera worklets.
 *
 * Model output for best_yolov8n (320x320, 10 classes):
 *   Shape: [1, 14, 2100] — channels-first
 *   Row 0: cx values (pixel coords, 0–320)
 *   Row 1: cy values
 *   Row 2: w values
 *   Row 3: h values
 *   Row 4–13: class scores (already post-sigmoid, do NOT apply sigmoid again)
 */
import { YOLO_CLASSES, YOLO_CONFIG } from '../config/yolo';

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: number;
  className: string;
  confidence: number;
}

const calculateIoU = (
  box1: [number, number, number, number],
  box2: [number, number, number, number],
): number => {
  'worklet';
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  const intersectionArea =
    Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2)) *
    Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
  const unionArea = w1 * h1 + w2 * h2 - intersectionArea;
  return unionArea > 0 ? intersectionArea / unionArea : 0;
};

const nms = (detections: Detection[], iouThreshold: number): Detection[] => {
  'worklet';
  detections.sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];
  const suppressed = new Set<number>();
  for (let i = 0; i < detections.length; i++) {
    if (suppressed.has(i)) continue;
    keep.push(detections[i]);
    for (let j = i + 1; j < detections.length; j++) {
      if (
        !suppressed.has(j) &&
        calculateIoU(detections[i].bbox, detections[j].bbox) > iouThreshold
      ) {
        suppressed.add(j);
      }
    }
  }
  return keep;
};

export const processYoloOutput = (
  output: Float32Array,
  imageWidth: number,
  imageHeight: number,
  modelInputSize: number = YOLO_CONFIG.INPUT_SIZE,
  outputShape?: readonly number[],
): Detection[] => {
  'worklet';
  const detections: Detection[] = [];
  const numClasses = YOLO_CLASSES.length;

  // Layout: channels-first [1, 14, 2100]
  // Access: output[channel * numDetections + detectionIndex]
  const numDetections = outputShape && outputShape.length >= 3
    ? outputShape[2]
    : Math.floor(output.length / (4 + numClasses));

  for (let i = 0; i < numDetections; i++) {
    // Class scores are ALREADY post-sigmoid from the TFLite export.
    // Do NOT apply sigmoid again — that was the original bug causing inaccuracy.
    let maxScore = 0;
    let bestClass = 0;
    for (let j = 0; j < numClasses; j++) {
      const score = output[(4 + j) * numDetections + i];
      if (score > maxScore) {
        maxScore = score;
        bestClass = j;
      }
    }

    if (maxScore > YOLO_CONFIG.CONFIDENCE_THRESHOLD) {
      // Bbox: cx, cy, w, h — normalized (0-1)
      const cx = output[0 * numDetections + i];
      const cy = output[1 * numDetections + i];
      const w = output[2 * numDetections + i];
      const h = output[3 * numDetections + i];

      detections.push({
        bbox: [
          Math.max(0, (cx - w / 2) * imageWidth),
          Math.max(0, (cy - h / 2) * imageHeight),
          w * imageWidth,
          h * imageHeight,
        ],
        class: bestClass,
        className: YOLO_CLASSES[bestClass] || `Class ${bestClass}`,
        confidence: maxScore,
      });
    }
  }
  return nms(detections, YOLO_CONFIG.IOU_THRESHOLD).slice(
    0,
    YOLO_CONFIG.MAX_DETECTIONS,
  );
};
