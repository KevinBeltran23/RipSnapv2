/**
 * TFLite detection utilities for RipSnap models.
 *
 * The ripsnap_models exports use the TensorFlow object-detection postprocess
 * shape: boxes, classes, scores, and detection count.
 */
import { DETECTION_CONFIG, RIP_CURRENT_CLASSES } from '../config/detection';

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: number;
  className: string;
  confidence: number;
}

type DetectionTensor =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array;

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

const clamp = (value: number, min: number, max: number): number => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const looksLikeClassTensor = (tensor: DetectionTensor): boolean => {
  'worklet';
  const sampleCount = Math.min(tensor.length, 20);
  let integerLike = 0;

  for (let i = 0; i < sampleCount; i++) {
    const value = Number(tensor[i]);
    if (Math.abs(value - Math.round(value)) < 0.001) {
      integerLike++;
    }
  }

  return sampleCount > 0 && integerLike === sampleCount;
};

const findOutputTensors = (
  outputs: DetectionTensor[],
): {
  boxes: DetectionTensor | null;
  classes: DetectionTensor | null;
  scores: DetectionTensor | null;
  count: DetectionTensor | null;
} => {
  'worklet';
  let boxes: DetectionTensor | null = null;
  let classes: DetectionTensor | null = null;
  let scores: DetectionTensor | null = null;
  let count: DetectionTensor | null = null;

  for (let i = 0; i < outputs.length; i++) {
    if (outputs[i].length === 1) {
      count = outputs[i];
      break;
    }
  }

  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    if (output === count) continue;
    if (output.length > 4 && output.length % 4 === 0) {
      boxes = output;
      break;
    }
  }

  const detectionCount = boxes ? Math.floor(boxes.length / 4) : 0;

  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    if (
      output === count ||
      output === boxes ||
      output.length !== detectionCount
    ) {
      continue;
    }

    if (classes == null && looksLikeClassTensor(output)) {
      classes = output;
    } else if (scores == null) {
      scores = output;
    }
  }

  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    if (
      output === count ||
      output === boxes ||
      output === classes ||
      output.length !== detectionCount
    ) {
      continue;
    }

    if (scores == null) {
      scores = output;
    } else if (classes == null) {
      classes = output;
    }
  }

  return { boxes, classes, scores, count };
};

export const processObjectDetectionOutputs = (
  outputs: DetectionTensor[],
  imageWidth: number,
  imageHeight: number,
  modelInputWidth: number = DETECTION_CONFIG.DEFAULT_INPUT_SIZE,
  modelInputHeight: number = DETECTION_CONFIG.DEFAULT_INPUT_SIZE,
): Detection[] => {
  'worklet';
  const { boxes, classes, scores, count } = findOutputTensors(outputs);
  const detections: Detection[] = [];

  if (boxes == null || classes == null || scores == null) {
    return detections;
  }

  const maxByTensor = Math.min(
    Math.floor(boxes.length / 4),
    classes.length,
    scores.length,
  );
  const declaredCount =
    count != null ? Math.max(0, Math.floor(Number(count[0]))) : maxByTensor;
  const detectionCount = Math.min(maxByTensor, declaredCount);

  for (let i = 0; i < detectionCount; i++) {
    const confidence = Number(scores[i]);
    if (confidence < DETECTION_CONFIG.CONFIDENCE_THRESHOLD) {
      continue;
    }

    let yMin = Number(boxes[i * 4]);
    let xMin = Number(boxes[i * 4 + 1]);
    let yMax = Number(boxes[i * 4 + 2]);
    let xMax = Number(boxes[i * 4 + 3]);

    if (xMax < xMin) {
      const nextXMin = xMax;
      xMax = xMin;
      xMin = nextXMin;
    }

    if (yMax < yMin) {
      const nextYMin = yMax;
      yMax = yMin;
      yMin = nextYMin;
    }

    const normalized = xMin <= 1.5 && xMax <= 1.5 && yMin <= 1.5 && yMax <= 1.5;
    const scaleX = normalized ? imageWidth : imageWidth / modelInputWidth;
    const scaleY = normalized ? imageHeight : imageHeight / modelInputHeight;

    const x = clamp(xMin * scaleX, 0, imageWidth);
    const y = clamp(yMin * scaleY, 0, imageHeight);
    const width = clamp((xMax - xMin) * scaleX, 0, imageWidth - x);
    const height = clamp((yMax - yMin) * scaleY, 0, imageHeight - y);

    if (width <= 0 || height <= 0) {
      continue;
    }

    const classIndex = Math.max(0, Math.floor(Number(classes[i])));
    detections.push({
      bbox: [x, y, width, height],
      class: classIndex,
      className: RIP_CURRENT_CLASSES[classIndex] ?? RIP_CURRENT_CLASSES[0],
      confidence,
    });
  }

  return nms(detections, DETECTION_CONFIG.IOU_THRESHOLD).slice(
    0,
    DETECTION_CONFIG.MAX_DETECTIONS,
  );
};
