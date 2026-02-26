/**
 * Camera utilities: best-format selection + frame resizer (BGRA → RGB).
 * Consolidates formatFilter.ts + resizePlugin.ts.
 */
import { CameraDevice, CameraDeviceFormat, Frame } from 'react-native-vision-camera';

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
            outputFrame[destIndex] = data[srcIndex + 2];     // R
            outputFrame[destIndex + 1] = data[srcIndex + 1]; // G
            outputFrame[destIndex + 2] = data[srcIndex];     // B
        }
    }
    return outputFrame;
}
