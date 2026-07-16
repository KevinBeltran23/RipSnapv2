import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import type { TensorflowModel } from 'react-native-fast-tflite';
import type { RipCurrentModelConfig } from '../../config/detection';
import type { DetectionSettings } from '../../contexts/DetectionSettingsContext';
import {
  type Detection,
  processObjectDetectionOutputs,
} from '../../utils/detection';
import type { RipManualUploadMedia } from '../../types/ripMap';

type ManualUploadAnalysisSource = 'manual_photo_upload' | 'manual_video_upload';

type ManualUploadAnalysisStatus = 'completed' | 'failed' | 'skipped';

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
  errorMessage?: string;
}

export interface ManualUploadAnalysisResult {
  analysis: ManualUploadAnalysisMetadata;
  frames: ManualUploadFrameRecord[];
  modelName?: string;
  modelInputSize?: number;
  mediaWidth: number;
  mediaHeight: number;
}

interface AnalyzeManualPhotoParams {
  media: RipManualUploadMedia;
  model: TensorflowModel;
  modelConfig: Pick<RipCurrentModelConfig, 'name' | 'inputSize'>;
  detectionSettings: DetectionSettings;
}

const FALLBACK_MEDIA_SIZE = 1;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Manual photo analysis failed.';
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
): ManualUploadFrameRecord => ({
  timestamp,
  elapsedMs: 0,
  frameIndex: 0,
  detections: serializeDetections(detections),
});

const getModelInputSize = (
  model: TensorflowModel,
  modelConfig: Pick<RipCurrentModelConfig, 'inputSize'>,
): { width: number; height: number; dataType: 'uint8' | 'float32' } => {
  const inputTensor = model.inputs[0];
  return {
    width: inputTensor?.shape[2] ?? modelConfig.inputSize,
    height: inputTensor?.shape[1] ?? modelConfig.inputSize,
    dataType: inputTensor?.dataType === 'uint8' ? 'uint8' : 'float32',
  };
};

const decodeImage = async (media: RipManualUploadMedia) => {
  const data = media.analysisBase64
    ? Skia.Data.fromBase64(media.analysisBase64)
    : await Skia.Data.fromURI(media.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Could not decode selected photo.');
  }
  return image;
};

const resizeImageToRgbaPixels = async (
  media: RipManualUploadMedia,
  width: number,
  height: number,
) => {
  const image = await decodeImage(media);
  const mediaWidth = image.width();
  const mediaHeight = image.height();
  const surface = Skia.Surface.Make(width, height);
  if (!surface) {
    throw new Error('Could not create image preprocessing surface.');
  }

  const canvas = surface.getCanvas();
  const src = Skia.XYWHRect(0, 0, mediaWidth, mediaHeight);
  const dest = Skia.XYWHRect(0, 0, width, height);
  canvas.clear(Skia.Color('black'));
  canvas.drawImageRect(image, src, dest, Skia.Paint(), true);
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const pixels = snapshot.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels || !(pixels instanceof Uint8Array)) {
    throw new Error('Could not read resized photo pixels.');
  }

  return { pixels, mediaWidth, mediaHeight };
};

const pixelsToRgbTensor = (
  rgbaPixels: Uint8Array,
  dataType: 'uint8' | 'float32',
) => {
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
    tensor[j] = rgbaPixels[i];
    tensor[j + 1] = rgbaPixels[i + 1];
    tensor[j + 2] = rgbaPixels[i + 2];
  }
  return tensor;
};

export const createFailedManualPhotoAnalysis = (
  error: unknown,
  modelConfig: Pick<RipCurrentModelConfig, 'name' | 'inputSize'>,
  media: RipManualUploadMedia,
): ManualUploadAnalysisResult => ({
  analysis: {
    status: 'failed',
    source: 'manual_photo_upload',
    processedAt: new Date().toISOString(),
    errorMessage: toErrorMessage(error),
  },
  frames: [],
  modelName: modelConfig.name,
  modelInputSize: modelConfig.inputSize,
  mediaWidth: media.width ?? FALLBACK_MEDIA_SIZE,
  mediaHeight: media.height ?? FALLBACK_MEDIA_SIZE,
});

export const createSkippedManualVideoAnalysis = (
  media: RipManualUploadMedia,
): ManualUploadAnalysisResult => ({
  analysis: {
    status: 'skipped',
    source: 'manual_video_upload',
    processedAt: new Date().toISOString(),
  },
  frames: [],
  mediaWidth: media.width ?? FALLBACK_MEDIA_SIZE,
  mediaHeight: media.height ?? FALLBACK_MEDIA_SIZE,
});

export const analyzeManualPhotoUpload = async ({
  media,
  model,
  modelConfig,
  detectionSettings,
}: AnalyzeManualPhotoParams): Promise<ManualUploadAnalysisResult> => {
  const { width, height, dataType } = getModelInputSize(model, modelConfig);
  const { pixels, mediaWidth, mediaHeight } = await resizeImageToRgbaPixels(
    media,
    width,
    height,
  );
  const inputTensor = pixelsToRgbTensor(pixels, dataType);
  const outputs = model.runSync([inputTensor]);
  const firstOutputShape = model.outputs[0]?.shape ?? null;
  const detections = processObjectDetectionOutputs(
    outputs as Parameters<typeof processObjectDetectionOutputs>[0],
    mediaWidth,
    mediaHeight,
    width,
    height,
    detectionSettings.confidenceThreshold,
    detectionSettings.maxDetections,
    firstOutputShape,
  );
  const timestamp = new Date().toISOString();

  return {
    analysis: {
      status: 'completed',
      source: 'manual_photo_upload',
      processedAt: timestamp,
    },
    frames: [createFrameRecord(detections, timestamp)],
    modelName: modelConfig.name,
    modelInputSize: width,
    mediaWidth,
    mediaHeight,
  };
};
