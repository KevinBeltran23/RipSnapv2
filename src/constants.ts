export const BOTTOM_SHEET_SNAP_POINTS = ['15%', '50%', '85%'];

export const INITIAL_REGION = {
  latitude: 35.2828,
  longitude: -120.6596,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

import { Colors } from './hooks/useColors';

export type CategoryOption = {
  id: number;
  color: keyof Colors;
  label: string;
  icon: string;
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 0, color: 'gray200', label: 'Ramp Access', icon: 'slope-uphill' },
  {
    id: 1,
    color: 'gray200',
    label: 'Accessible Restroom',
    icon: 'toilet',
  },
  { id: 2, color: 'gray200', label: 'Quiet Space', icon: 'ear-hearing' },
  { id: 3, color: 'gray200', label: 'Automatic Doors', icon: 'door-open' },
  { id: 4, color: 'gray200', label: 'Elevator', icon: 'elevator' },
];

export type SeverityOption = {
  id: string;
  label: string;
  level: string;
  color: keyof Colors;
  icon: string;
};

export const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    id: 'Fully Accessible',
    label: 'Fully Accessible',
    level: 'fully_accessible',
    color: 'fullyAccessible',
    icon: '',
  },
  {
    id: 'Partially Accessible',
    label: 'Partially Accessible',
    level: 'partially_accessible',
    color: 'partiallyAccessible',
    icon: '',
  },
  {
    id: 'Limited Accessibility',
    label: 'Limited Accessibility',
    level: 'limited_accessibility',
    color: 'limitedAccessibility',
    icon: '',
  },
  {
    id: 'Not Accessible',
    label: 'Not Accessible',
    level: 'not_accessible',
    color: 'notAccessible',
    icon: '',
  },
  {
    id: 'Unknown Accessibility',
    label: 'Unknown',
    level: 'unknown_accessibility',
    color: 'unknownAccessibility',
    icon: '',
  },
];

export const MAP_STYLES = [
  {
    id: 'Basic',
    label: 'Basic',
    style: 'mapbox://styles/mapbox/streets-v11',
  },
  {
    id: 'Satellite',
    label: 'Satellite',
    style: 'mapbox://styles/mapbox/satellite-v9',
  },
  {
    id: 'Dark',
    label: 'Dark',
    style: 'mapbox://styles/mapbox/dark-v10',
  },
  {
    id: 'Light',
    label: 'Light',
    style: 'mapbox://styles/mapbox/light-v10',
  },
];

export const YOLO_CLASSES = [
  'accessibility_symbol',
  'crosswalk',
  'elevator',
  'exit_sign',
  'green_pedestrian_light',
  'red_pedestrian_light',
  'ramp',
  'restroom_sign',
  'stairs',
  'water_fountain',
];

// YOLO COCO Dataset class names (80 classes)
export const COCO_YOLO_CLASSES = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
];

// YOLO Detection Configuration
export const YOLO_CONFIG = {
  INPUT_SIZE: 320,
  CONFIDENCE_THRESHOLD: 0.55,
  IOU_THRESHOLD: 0.5,
  MAX_DETECTIONS: 5,
};
