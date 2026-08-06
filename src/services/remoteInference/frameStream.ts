import type { PhotoFile } from 'react-native-vision-camera';
import { REMOTE_INFERENCE_BASE_URL } from '../../config/remoteInference';

const CREATE_TIMEOUT_MS = 10_000;
const FRAME_TIMEOUT_MS = 15_000;
const COMPLETE_TIMEOUT_MS = 10_000;

export interface RemoteVideoStream {
  videoId: string;
  captureId: string;
  state: 'recording' | 'completed';
  frameUrl: string;
  completeUrl: string;
  createdAt: string;
}

export interface RemoteStreamFrameReceipt {
  videoId: string;
  sequence: number;
  frameCount: number;
  sizeBytes: number;
  receivedAt: string;
}

export interface RemoteVideoStreamCompleteReceipt {
  videoId: string;
  captureId: string;
  state: 'recording' | 'completed';
  frameCount: number;
  firstSequence: number | null;
  lastSequence: number | null;
  framesSent: number;
  durationMs: number | null;
  manifestPath: string;
  completedAt: string | null;
}

interface CreateVideoStreamOptions {
  captureId: string;
  sourceWidth?: number;
  sourceHeight?: number;
  orientation: string;
  mirrored: boolean;
  targetFps: number;
}

interface CompleteVideoStreamOptions {
  lastSequence?: number;
  framesSent: number;
  durationMs: number;
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function readErrorMessage(
  body: string,
  statusCode: number,
  media: string,
): string {
  try {
    const payload = JSON.parse(body) as { detail?: string };
    if (typeof payload.detail === 'string' && payload.detail.length > 0) {
      return payload.detail;
    }
  } catch {
    // Fall through to the HTTP status when the server did not return JSON.
  }

  return `Server rejected the ${media} (HTTP ${statusCode}).`;
}

function ensureConfigured(): void {
  if (!REMOTE_INFERENCE_BASE_URL) {
    throw new Error(
      'Set EXPO_PUBLIC_REMOTE_INFERENCE_URL to the server LAN address before recording.',
    );
  }
}

async function readJsonResponse<T>(
  response: Response,
  media: string,
): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(readErrorMessage(body, response.status, media));
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`The server returned an invalid ${media} receipt.`);
  }
}

export async function createVideoFrameStream(
  options: CreateVideoStreamOptions,
): Promise<RemoteVideoStream> {
  ensureConfigured();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${REMOTE_INFERENCE_BASE_URL}/v1/video-streams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captureId: options.captureId,
        ...(options.sourceWidth && options.sourceWidth > 0
          ? { sourceWidth: options.sourceWidth }
          : {}),
        ...(options.sourceHeight && options.sourceHeight > 0
          ? { sourceHeight: options.sourceHeight }
          : {}),
        orientation: options.orientation,
        mirrored: options.mirrored,
        targetFps: options.targetFps,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The remote server did not respond within 10 seconds while starting the stream.',
      );
    }
    throw new Error(
      'Could not reach the remote server. Verify the phone and laptop are on the same Wi-Fi network.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  return readJsonResponse<RemoteVideoStream>(response, 'video stream');
}

export async function uploadVideoStreamFrame(
  videoId: string,
  photo: PhotoFile,
  sequence: number,
  capturedAtMs: number,
): Promise<RemoteStreamFrameReceipt> {
  ensureConfigured();

  const form = new FormData();
  form.append('frame', {
    uri: toFileUri(photo.path),
    name: `frame_${sequence}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('sequence', String(sequence));
  form.append('capturedAtMs', String(capturedAtMs));
  if (photo.width > 0) {
    form.append('sourceWidth', String(photo.width));
  }
  if (photo.height > 0) {
    form.append('sourceHeight', String(photo.height));
  }
  form.append('orientation', photo.orientation);
  form.append('mirrored', String(photo.isMirrored));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FRAME_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      `${REMOTE_INFERENCE_BASE_URL}/v1/video-streams/${encodeURIComponent(videoId)}/frames`,
      {
        method: 'POST',
        body: form,
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The remote server did not respond within 15 seconds while sending a frame.',
      );
    }
    throw new Error('Could not reach the remote server while sending a frame.');
  } finally {
    clearTimeout(timeoutId);
  }

  return readJsonResponse<RemoteStreamFrameReceipt>(response, 'video frame');
}

export async function completeVideoFrameStream(
  videoId: string,
  options: CompleteVideoStreamOptions,
): Promise<RemoteVideoStreamCompleteReceipt> {
  ensureConfigured();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPLETE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      `${REMOTE_INFERENCE_BASE_URL}/v1/video-streams/${encodeURIComponent(videoId)}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(options.lastSequence !== undefined
            ? { lastSequence: options.lastSequence }
            : {}),
          framesSent: options.framesSent,
          durationMs: options.durationMs,
        }),
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The remote server did not respond within 10 seconds while closing the stream.',
      );
    }
    throw new Error(
      'Could not reach the remote server while closing the stream.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  return readJsonResponse<RemoteVideoStreamCompleteReceipt>(
    response,
    'video stream completion',
  );
}
