/**
 * Camera utilities: best-format selection + frame resizer (BGRA → RGB).
 * Consolidates formatFilter.ts + resizePlugin.ts.
 */
import {
  CameraDevice,
  CameraDeviceFormat,
  Frame,
  type Orientation,
} from 'react-native-vision-camera';

export type ResizeRotation = '0deg' | '90deg' | '180deg' | '270deg';

const orientationToDegrees = (orientation: Orientation): number => {
  'worklet';

  switch (orientation) {
    case 'portrait':
      return 0;
    case 'landscape-left':
      return 90;
    case 'portrait-upside-down':
      return 180;
    case 'landscape-right':
      return 270;
  }
};

/** Returns the frame rotation relative to the orientation rendered by the preview. */
export function getRelativeFrameOrientation(
  frameOrientation: Orientation,
  previewOrientation: Orientation,
): Orientation {
  'worklet';

  const difference =
    (orientationToDegrees(frameOrientation) -
      orientationToDegrees(previewOrientation) +
      360) %
    360;

  switch (difference) {
    case 0:
      return 'portrait';
    case 90:
      return 'landscape-left';
    case 180:
      return 'portrait-upside-down';
    default:
      return 'landscape-right';
  }
}

export function getResizeRotation(
  frameOrientation: Orientation,
  previewOrientation: Orientation,
): ResizeRotation {
  'worklet';

  switch (getRelativeFrameOrientation(frameOrientation, previewOrientation)) {
    case 'portrait':
      return '0deg';
    case 'landscape-left':
      return '270deg';
    case 'portrait-upside-down':
      return '180deg';
    case 'landscape-right':
      return '90deg';
  }
}

export function getBestFormat(
  device: CameraDevice,
  targetWidth: number,
  targetHeight: number,
): CameraDeviceFormat {
  const size = targetWidth * targetHeight;
  return device.formats.reduce((prev, curr) => {
    const diff = Math.abs(size - curr.videoWidth * curr.videoHeight);
    const prevDiff = Math.abs(size - prev.videoWidth * prev.videoHeight);
    return diff < prevDiff ? curr : prev;
  }, device.formats[0]);
}

/**
 * Maps a model box back through the resize plugin's center crop and the
 * camera preview's cover transform.
 */
export function mapDetectionToPreview(
  bbox: [number, number, number, number],
  frameWidth: number,
  frameHeight: number,
  frameOrientation: Orientation,
  previewOrientation: Orientation,
  modelInputWidth: number,
  modelInputHeight: number,
  previewWidth: number,
  previewHeight: number,
  mirror: boolean,
): [number, number, number, number] {
  'worklet';

  if (
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    modelInputWidth <= 0 ||
    modelInputHeight <= 0 ||
    previewWidth <= 0 ||
    previewHeight <= 0
  ) {
    return [0, 0, 0, 0];
  }

  const relativeOrientation = getRelativeFrameOrientation(
    frameOrientation,
    previewOrientation,
  );
  const quarterTurn =
    relativeOrientation === 'landscape-left' ||
    relativeOrientation === 'landscape-right';
  const frameAspect = frameWidth / frameHeight;
  const modelAspect = modelInputWidth / modelInputHeight;

  // This mirrors the resize plugin's automatic center-crop calculation.
  let cropWidth = frameWidth;
  let cropHeight = frameHeight;
  if (frameAspect > modelAspect) {
    cropWidth = frameHeight * modelAspect;
  } else {
    cropHeight = frameWidth / modelAspect;
  }

  // The plugin rotates after cropping, so the crop dimensions swap for a
  // quarter-turn. The models currently used by RipSnap are square, but this
  // keeps the transform correct if a rectangular model is added later.
  const sourceWidth = quarterTurn ? frameHeight : frameWidth;
  const sourceHeight = quarterTurn ? frameWidth : frameHeight;
  const sourceCropWidth = quarterTurn ? cropHeight : cropWidth;
  const sourceCropHeight = quarterTurn ? cropWidth : cropHeight;
  const cropLeft = (sourceWidth - sourceCropWidth) / 2;
  const cropTop = (sourceHeight - sourceCropHeight) / 2;

  const sourceX = cropLeft + bbox[0] * sourceCropWidth;
  const sourceY = cropTop + bbox[1] * sourceCropHeight;
  const sourceBoxWidth = bbox[2] * sourceCropWidth;
  const sourceBoxHeight = bbox[3] * sourceCropHeight;

  // Camera preview uses `cover`: preserve the source aspect ratio and crop
  // whichever axis exceeds the preview bounds.
  const coverScale = Math.max(
    previewWidth / sourceWidth,
    previewHeight / sourceHeight,
  );
  const renderedWidth = sourceWidth * coverScale;
  const renderedHeight = sourceHeight * coverScale;
  const offsetX = (previewWidth - renderedWidth) / 2;
  const offsetY = (previewHeight - renderedHeight) / 2;

  let previewX = offsetX + sourceX * coverScale;
  const previewY = offsetY + sourceY * coverScale;
  const previewBoxWidth = sourceBoxWidth * coverScale;
  const previewBoxHeight = sourceBoxHeight * coverScale;

  if (mirror) {
    previewX = previewWidth - previewX - previewBoxWidth;
  }

  return [previewX, previewY, previewBoxWidth, previewBoxHeight];
}

// Cache array to prevent constant re-allocation in the worklet
const CACHE_ID = '__cachedArrayForResizer';
function getArrayFromCache(size: number): Int8Array {
  'worklet';
  const globalAny = global as any;
  if (globalAny[CACHE_ID] == null || globalAny[CACHE_ID].length !== size) {
    globalAny[CACHE_ID] = new Int8Array(size);
  }
  return globalAny[CACHE_ID];
}

/**
 * Resizes a camera Frame (BGRA) to the given target dimensions (RGB).
 * Runs in a Vision Camera worklet.
 */
export function resize(frame: Frame, width: number, height: number): Int8Array {
  'worklet';
  const inputBytesPerRow = frame.bytesPerRow;
  const inputWidth = frame.width;
  const inputHeight = frame.height;
  const inputPixelSize = Math.floor(inputBytesPerRow / inputWidth);
  const padding = inputBytesPerRow - inputWidth * inputPixelSize;
  const targetPixelSize = 3;

  const arrayData = frame.toArrayBuffer();
  const outputFrame = getArrayFromCache(width * height * targetPixelSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor((x / width) * (inputWidth + padding));
      const srcY = Math.floor((y / height) * inputHeight);
      const srcIndex = (srcY * (inputWidth + padding) + srcX) * inputPixelSize;
      const destIndex = (y * width + x) * targetPixelSize;
      const data = new Uint8Array(arrayData);
      outputFrame[destIndex] = data[srcIndex + 2]; // R
      outputFrame[destIndex + 1] = data[srcIndex + 1]; // G
      outputFrame[destIndex + 2] = data[srcIndex]; // B
    }
  }
  return outputFrame;
}
