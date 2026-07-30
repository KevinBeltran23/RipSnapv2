import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { TensorflowModel } from 'react-native-fast-tflite';
import type { RipCurrentModelConfig } from '../../config/detection';
import type { DetectionSettings } from '../../contexts/DetectionSettingsContext';
import {
  type Detection,
  processObjectDetectionOutputs,
} from '../../utils/detection';
import type { RipManualUploadMedia } from '../../types/ripMap';

export type ManualUploadAnalysisSource =
  | 'manual_photo_upload'
  | 'manual_video_upload';

export type ManualUploadAnalysisStatus = 'completed';

export interface ManualUploadFrameRecord {
  timestamp: string;
  elapsedMs: number;
  frameIndex: number;
  detections: {
    class: number;
    className: string;
    confidence: number;
    bbox: [number, number, number, number];
  }[];
}

export interface ManualUploadAnalysisMetadata {
  status: ManualUploadAnalysisStatus;
  source: ManualUploadAnalysisSource;
  processedAt: string;
}

export interface ManualUploadAnalysisResult {
  analysis: ManualUploadAnalysisMetadata;
  frames: ManualUploadFrameRecord[];
  modelName: string;
  modelInputSize: number;
  mediaWidth: number;
  mediaHeight: number;
}

export interface ManualUploadAnalysisProgress {
  processedFrames: number;
  totalFrames: number;
  elapsedMs: number;
}

interface AnalyzeManualImageParams {
  media: RipManualUploadMedia;
  model: TensorflowModel;
  modelConfig: Pick<RipCurrentModelConfig, 'name' | 'inputSize'>;
  detectionSettings: DetectionSettings;
}

interface AnalyzeManualVideoParams extends AnalyzeManualImageParams {
  onProgress?: (progress: ManualUploadAnalysisProgress) => void;
  isCancelled?: () => boolean;
}

interface EncodedImageSource {
  uri: string;
  analysisBase64?: string;
}

interface ModelInputSpec {
  width: number;
  height: number;
  dataType: 'uint8' | 'float32';
  firstOutputShape: readonly number[] | null;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PreparedImage {
  inputTensor: Uint8Array | Float32Array;
  mediaWidth: number;
  mediaHeight: number;
  crop: CropRect;
}

const VIDEO_SAMPLE_INTERVAL_MS = 100;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Manual media analysis failed.';
};

const serializeDetections = (detections: Detection[]) =>
  detections.map(detection => ({
    class: detection.class,
    className: detection.className,
    confidence: detection.confidence,
    bbox: detection.bbox,
  }));

const createFrameRecord = (
  detections: Detection[],
  timestamp: string,
  elapsedMs: number,
  frameIndex: number,
): ManualUploadFrameRecord => ({
  timestamp,
  elapsedMs,
  frameIndex,
  detections: serializeDetections(detections),
});

const getModelInputSpec = (
  model: TensorflowModel,
  fallbackInputSize: number,
): ModelInputSpec => {
  const inputTensor = model.inputs[0];
  return {
    width: inputTensor?.shape[2] ?? fallbackInputSize,
    height: inputTensor?.shape[1] ?? fallbackInputSize,
    dataType: inputTensor?.dataType === 'uint8' ? 'uint8' : 'float32',
    firstOutputShape: model.outputs[0]?.shape ?? null,
  };
};

const getCenterCrop = (
  mediaWidth: number,
  mediaHeight: number,
  targetWidth: number,
  targetHeight: number,
): CropRect => {
  const mediaAspect = mediaWidth / mediaHeight;
  const targetAspect = targetWidth / targetHeight;

  if (mediaAspect > targetAspect) {
    const cropWidth = mediaHeight * targetAspect;
    return {
      x: (mediaWidth - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: mediaHeight,
    };
  }

  const cropHeight = mediaWidth / targetAspect;
  return {
    x: 0,
    y: (mediaHeight - cropHeight) / 2,
    width: mediaWidth,
    height: cropHeight,
  };
};

const decodeImage = async (source: EncodedImageSource) => {
  const data = source.analysisBase64
    ? Skia.Data.fromBase64(source.analysisBase64)
    : await Skia.Data.fromURI(source.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Could not decode media frame.');
  }
  return image;
};

const pixelsToRgbTensor = (
  rgbaPixels: Uint8Array,
  dataType: 'uint8' | 'float32',
): Uint8Array | Float32Array => {
  const pixelCount = rgbaPixels.length / 4;

  if (dataType === 'uint8') {
    const tensor = new Uint8Array(pixelCount * 3);
    for (let i = 0, j = 0; i < rgbaPixels.length; i += 4, j += 3) {
      tensor[j] = rgbaPixels[i];
      tensor[j + 1] = rgbaPixels[i + 1];
      tensor[j + 2] = rgbaPixels[i + 2];
    }
    return tensor;
  }

  const tensor = new Float32Array(pixelCount * 3);
  for (let i = 0, j = 0; i < rgbaPixels.length; i += 4, j += 3) {
    tensor[j] = rgbaPixels[i] / 255;
    tensor[j + 1] = rgbaPixels[i + 1] / 255;
    tensor[j + 2] = rgbaPixels[i + 2] / 255;
  }
  return tensor;
};

const prepareImage = async (
  source: EncodedImageSource,
  modelInput: ModelInputSpec,
): Promise<PreparedImage> => {
  const image = await decodeImage(source);
  const mediaWidth = image.width();
  const mediaHeight = image.height();
  if (mediaWidth <= 0 || mediaHeight <= 0) {
    throw new Error('Media frame has invalid dimensions.');
  }

  const crop = getCenterCrop(
    mediaWidth,
    mediaHeight,
    modelInput.width,
    modelInput.height,
  );
  const surface = Skia.Surface.Make(modelInput.width, modelInput.height);
  if (!surface) {
    throw new Error('Could not create media preprocessing surface.');
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('black'));
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(crop.x, crop.y, crop.width, crop.height),
    Skia.XYWHRect(0, 0, modelInput.width, modelInput.height),
    Skia.Paint(),
    true,
  );
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const pixels = snapshot.readPixels(0, 0, {
    width: modelInput.width,
    height: modelInput.height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels || !(pixels instanceof Uint8Array)) {
    throw new Error('Could not read resized media pixels.');
  }

  return {
    inputTensor: pixelsToRgbTensor(pixels, modelInput.dataType),
    mediaWidth,
    mediaHeight,
    crop,
  };
};

const analyzeEncodedImage = async ({
  source,
  model,
  modelInput,
  detectionSettings,
}: {
  source: EncodedImageSource;
  model: TensorflowModel;
  modelInput: ModelInputSpec;
  detectionSettings: DetectionSettings;
}) => {
  const prepared = await prepareImage(source, modelInput);
  const outputs = model.runSync([prepared.inputTensor]);
  const cropDetections = processObjectDetectionOutputs(
    outputs as Parameters<typeof processObjectDetectionOutputs>[0],
    prepared.crop.width,
    prepared.crop.height,
    modelInput.width,
    modelInput.height,
    detectionSettings.confidenceThreshold,
    detectionSettings.maxDetections,
    modelInput.firstOutputShape,
  );

  const detections = cropDetections.map(detection => ({
    ...detection,
    bbox: [
      prepared.crop.x + detection.bbox[0],
      prepared.crop.y + detection.bbox[1],
      detection.bbox[2],
      detection.bbox[3],
    ] as [number, number, number, number],
  }));

  return {
    detections,
    mediaWidth: prepared.mediaWidth,
    mediaHeight: prepared.mediaHeight,
  };
};

export const analyzeManualPhotoUpload = async ({
  media,
  model,
  modelConfig,
  detectionSettings,
}: AnalyzeManualImageParams): Promise<ManualUploadAnalysisResult> => {
  const modelInput = getModelInputSpec(model, modelConfig.inputSize);
  const result = await analyzeEncodedImage({
    source: {
      uri: media.uri,
      analysisBase64: media.analysisBase64,
    },
    model,
    modelInput,
    detectionSettings,
  });
  const timestamp = new Date().toISOString();

  return {
    analysis: {
      status: 'completed',
      source: 'manual_photo_upload',
      processedAt: timestamp,
    },
    frames: [createFrameRecord(result.detections, timestamp, 0, 0)],
    modelName: modelConfig.name,
    modelInputSize: modelInput.width,
    mediaWidth: result.mediaWidth,
    mediaHeight: result.mediaHeight,
  };
};

export const analyzeManualVideoUpload = async ({
  media,
  model,
  modelConfig,
  detectionSettings,
  onProgress,
  isCancelled,
}: AnalyzeManualVideoParams): Promise<ManualUploadAnalysisResult> => {
  const durationMs = media.durationMs ?? 0;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('Could not determine the selected video duration.');
  }

  const modelInput = getModelInputSpec(model, modelConfig.inputSize);
  const totalFrames = Math.max(
    1,
    Math.ceil(durationMs / VIDEO_SAMPLE_INTERVAL_MS),
  );
  const frames: ManualUploadFrameRecord[] = [];
  let mediaWidth = 0;
  let mediaHeight = 0;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (isCancelled?.()) {
      throw new Error('Manual media analysis cancelled.');
    }

    const elapsedMs = Math.min(
      frameIndex * VIDEO_SAMPLE_INTERVAL_MS,
      Math.max(0, durationMs - 1),
    );
    const thumbnail = await VideoThumbnails.getThumbnailAsync(media.uri, {
      time: elapsedMs,
      quality: 1,
    });

    try {
      if (isCancelled?.()) {
        throw new Error('Manual media analysis cancelled.');
      }
      const result = await analyzeEncodedImage({
        source: { uri: thumbnail.uri },
        model,
        modelInput,
        detectionSettings,
      });
      mediaWidth = mediaWidth > 0 ? mediaWidth : result.mediaWidth;
      mediaHeight = mediaHeight > 0 ? mediaHeight : result.mediaHeight;
      frames.push(
        createFrameRecord(
          result.detections,
          new Date().toISOString(),
          elapsedMs,
          frameIndex,
        ),
      );
    } finally {
      await FileSystem.deleteAsync(thumbnail.uri, { idempotent: true }).catch(
        () => undefined,
      );
    }

    onProgress?.({
      processedFrames: frameIndex + 1,
      totalFrames,
      elapsedMs,
    });
  }

  if (mediaWidth <= 0 || mediaHeight <= 0) {
    throw new Error('Could not determine the selected video dimensions.');
  }

  const processedAt = new Date().toISOString();
  return {
    analysis: {
      status: 'completed',
      source: 'manual_video_upload',
      processedAt,
    },
    frames,
    modelName: modelConfig.name,
    modelInputSize: modelInput.width,
    mediaWidth,
    mediaHeight,
  };
};

export const getManualAnalysisErrorMessage = (error: unknown): string =>
  toErrorMessage(error);
