/**
 * YOLO detection utilities: bounding-box NMS + output parsing.
 * These functions run inside Vision Camera worklets.
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
    return intersectionArea / unionArea;
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
            if (!suppressed.has(j) && calculateIoU(detections[i].bbox, detections[j].bbox) > iouThreshold) {
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
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    let channelsFirst = false;
    let numDetections: number;
    let numChannels: number;

    if (outputShape && outputShape.length >= 3) {
        const c1 = outputShape[1];
        const c2 = outputShape[2];
        if (c1 === 4 + numClasses || c1 === 5 + numClasses) {
            channelsFirst = true; numChannels = c1; numDetections = c2;
        } else if (c2 === 4 + numClasses || c2 === 5 + numClasses) {
            channelsFirst = false; numChannels = c2; numDetections = outputShape[1];
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
        const obj = hasObj ? sigmoid(getVal(i, 4)) : 1;
        let maxScore = 0; let bestClass = 0;
        for (let j = 0; j < numClasses; j++) {
            const score = sigmoid(getVal(i, (hasObj ? 5 : 4) + j)) * obj;
            if (score > maxScore) { maxScore = score; bestClass = j; }
        }
        if (maxScore > YOLO_CONFIG.CONFIDENCE_THRESHOLD) {
            const [cxRaw, cyRaw, wRaw, hRaw] = [getVal(i, 0), getVal(i, 1), getVal(i, 2), getVal(i, 3)];
            const norm = cxRaw > 1 || cyRaw > 1 || wRaw > 1 || hRaw > 1;
            const cx = norm ? cxRaw / modelInputSize : cxRaw;
            const cy = norm ? cyRaw / modelInputSize : cyRaw;
            const w = norm ? wRaw / modelInputSize : wRaw;
            const h = norm ? hRaw / modelInputSize : hRaw;
            detections.push({
                bbox: [Math.max(0, (cx - w / 2) * imageWidth), Math.max(0, (cy - h / 2) * imageHeight), w * imageWidth, h * imageHeight],
                class: bestClass,
                className: YOLO_CLASSES[bestClass] || `Class ${bestClass}`,
                confidence: maxScore,
            });
        }
    }
    return nms(detections, YOLO_CONFIG.IOU_THRESHOLD).slice(0, YOLO_CONFIG.MAX_DETECTIONS);
};
