import { CameraDevice, CameraDeviceFormat } from 'react-native-vision-camera';
import { YOLO_CLASSES, YOLO_CONFIG } from './constants';

/**
 * A type guard to check if an error object has a specific 'code' property.
 * This is useful for handling specific errors from libraries like Firebase.
 * @param error The error object to check.
 * @returns True if the error is an instance of Error and has a string 'code' property.
 */
export const isErrorWithCode = (
  error: unknown,
): error is Error & { code: string } => {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
};

export function getBestFormat(
  device: CameraDevice,
  targetWidth: number,
  targetHeight: number,
): CameraDeviceFormat {
  const size = targetWidth * targetHeight;
  return device.formats.reduce((prev, curr) => {
    const currentSize = curr.videoWidth * curr.videoHeight;
    const diff = Math.abs(size - currentSize);

    const previousSize = prev.videoWidth * prev.videoHeight;
    const prevDiff = Math.abs(size - previousSize);
    if (diff < prevDiff) {
      return curr;
    }
    return prev;
  }, device.formats[0]);
}

// YOLO Detection Types and Functions
export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: number;
  className: string;
  confidence: number;
}

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 */
const calculateIoU = (
  box1: [number, number, number, number],
  box2: [number, number, number, number],
): number => {
  'worklet';
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  const x1_min = x1,
    y1_min = y1,
    x1_max = x1 + w1,
    y1_max = y1 + h1;
  const x2_min = x2,
    y2_min = y2,
    x2_max = x2 + w2,
    y2_max = y2 + h2;

  const intersectionArea =
    Math.max(0, Math.min(x1_max, x2_max) - Math.max(x1_min, x2_min)) *
    Math.max(0, Math.min(y1_max, y2_max) - Math.max(y1_min, y2_min));

  const box1Area = w1 * h1;
  const box2Area = w2 * h2;
  const unionArea = box1Area + box2Area - intersectionArea;

  return intersectionArea / unionArea;
};

/**
 * Non-Maximum Suppression to filter overlapping detections
 */
const nms = (detections: Detection[], iouThreshold: number): Detection[] => {
  'worklet';
  // Sort by confidence (highest first)
  detections.sort((a, b) => b.confidence - a.confidence);

  const keep: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < detections.length; i++) {
    if (suppressed.has(i)) continue;

    keep.push(detections[i]);

    for (let j = i + 1; j < detections.length; j++) {
      if (suppressed.has(j)) continue;

      const iou = calculateIoU(detections[i].bbox, detections[j].bbox);
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return keep;
};

/**
 * Process YOLO model output to extract detections
 * YOLO11 typically outputs [1, 84, 8400] where:
 * - 84 = 4 (bbox) + 80 (classes)
 * - 8400 = number of anchor points
 */
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

  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  let channelsFirst = false;
  let numDetections: number;
  let numChannels: number;

  if (outputShape && outputShape.length >= 3) {
    const c1 = outputShape[1];
    const c2 = outputShape[2];
    if (c1 === 4 + numClasses || c1 === 5 + numClasses) {
      channelsFirst = true;
      numChannels = c1;
      numDetections = c2;
    } else if (c2 === 4 + numClasses || c2 === 5 + numClasses) {
      channelsFirst = false;
      numChannels = c2;
      numDetections = outputShape[1];
    } else {
      numChannels = 4 + numClasses;
      numDetections = Math.floor(output.length / numChannels);
    }
  } else {
    numChannels = 4 + numClasses;
    numDetections = Math.floor(output.length / numChannels);
  }

  const hasObj = numChannels === 5 + numClasses;

  const getVal = (i: number, k: number) =>
    channelsFirst ? output[k * numDetections + i] : output[i * numChannels + k];

  for (let i = 0; i < numDetections; i++) {
    const cxRaw = getVal(i, 0);
    const cyRaw = getVal(i, 1);
    const wRaw = getVal(i, 2);
    const hRaw = getVal(i, 3);

    const obj = hasObj ? sigmoid(getVal(i, 4)) : 1;

    let maxScore = 0;
    let bestClass = 0;
    for (let j = 0; j < numClasses; j++) {
      const raw = getVal(i, (hasObj ? 5 : 4) + j);
      const clsProb = sigmoid(raw);
      const score = clsProb * obj;
      if (score > maxScore) {
        maxScore = score;
        bestClass = j;
      }
    }

    if (maxScore > YOLO_CONFIG.CONFIDENCE_THRESHOLD) {
      const needNormalize = cxRaw > 1 || cyRaw > 1 || wRaw > 1 || hRaw > 1;

      const cx = needNormalize ? cxRaw / modelInputSize : cxRaw;
      const cy = needNormalize ? cyRaw / modelInputSize : cyRaw;
      const w = needNormalize ? wRaw / modelInputSize : wRaw;
      const h = needNormalize ? hRaw / modelInputSize : hRaw;

      const x = (cx - w / 2) * imageWidth;
      const y = (cy - h / 2) * imageHeight;
      const bw = w * imageWidth;
      const bh = h * imageHeight;

      detections.push({
        bbox: [Math.max(0, x), Math.max(0, y), bw, bh],
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
