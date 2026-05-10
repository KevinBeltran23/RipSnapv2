/** Rip-current model asset, labels, and inference configuration. */

export const RIP_CURRENT_CLASSES = ['rip_current'];

export type RipCurrentModelConfig = {
  name: string;
  displayName: string;
  shortName: string;
  architecture: 'tflite_object_detection';
  asset: number;
  inputSize: number;
  labels: readonly string[];
};

export const RIP_CURRENT_MODELS = [
  {
    name: 'efficientdet_lite0',
    displayName: 'EfficientDet Lite0 Rip Current',
    shortName: 'Lite0',
    architecture: 'tflite_object_detection',
    asset: require('../../ripsnap_models/efficientdet_lite0.tflite'),
    inputSize: 320,
    labels: RIP_CURRENT_CLASSES,
  },
  {
    name: 'efficientdet_lite1',
    displayName: 'EfficientDet Lite1 Rip Current',
    shortName: 'Lite1',
    architecture: 'tflite_object_detection',
    asset: require('../../ripsnap_models/efficientdet_lite1.tflite'),
    inputSize: 384,
    labels: RIP_CURRENT_CLASSES,
  },
  {
    name: 'efficientdet_lite2',
    displayName: 'EfficientDet Lite2 Rip Current',
    shortName: 'Lite2',
    architecture: 'tflite_object_detection',
    asset: require('../../ripsnap_models/efficientdet_lite2.tflite'),
    inputSize: 448,
    labels: RIP_CURRENT_CLASSES,
  },
  {
    name: 'ssd_mobilenet_v1',
    displayName: 'SSD MobileNet V1 Rip Current',
    shortName: 'SSD',
    architecture: 'tflite_object_detection',
    asset: require('../../ripsnap_models/ssd_mobilenet_v1.tflite'),
    inputSize: 300,
    labels: RIP_CURRENT_CLASSES,
  },
] as const satisfies readonly RipCurrentModelConfig[];

export const RIP_CURRENT_MODEL = RIP_CURRENT_MODELS[0];

export const DETECTION_CONFIG = {
  DEFAULT_INPUT_SIZE: 320,
  CONFIDENCE_THRESHOLD: 0.5,
  IOU_THRESHOLD: 0.45,
  MAX_DETECTIONS: 10,
};
