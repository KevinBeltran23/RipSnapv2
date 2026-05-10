/** Rip-current model asset, labels, and inference configuration. */

export const RIP_CURRENT_CLASSES = ['rip_current'];

export const RIP_CURRENT_MODEL = {
  name: 'efficientdet_lite0',
  displayName: 'EfficientDet Lite0 Rip Current',
  architecture: 'tflite_object_detection',
  asset: require('../../ripsnap_models/efficientdet_lite0.tflite'),
  inputSize: 320,
  labels: RIP_CURRENT_CLASSES,
} as const;

export const DETECTION_CONFIG = {
  DEFAULT_INPUT_SIZE: 320,
  CONFIDENCE_THRESHOLD: 0.5,
  IOU_THRESHOLD: 0.45,
  MAX_DETECTIONS: 10,
};

// Backwards-compatible aliases for older imports in the app.
export const YOLO_CLASSES = RIP_CURRENT_CLASSES;
export const YOLO_CONFIG = {
  INPUT_SIZE: DETECTION_CONFIG.DEFAULT_INPUT_SIZE,
  CONFIDENCE_THRESHOLD: DETECTION_CONFIG.CONFIDENCE_THRESHOLD,
  IOU_THRESHOLD: DETECTION_CONFIG.IOU_THRESHOLD,
  MAX_DETECTIONS: DETECTION_CONFIG.MAX_DETECTIONS,
};
