import type { VideoFile } from 'react-native-vision-camera';
import { REMOTE_INFERENCE_BASE_URL } from '../../config/remoteInference';

const REQUEST_TIMEOUT_MS = 120_000;

export interface RemoteVideoReceipt {
  videoId: string;
  captureId: string | null;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  receivedAt: string;
  sourceWidth: number | null;
  sourceHeight: number | null;
  durationSeconds: number | null;
  orientation: string | null;
  mirrored: boolean;
  processed: boolean;
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function readErrorMessage(body: string, statusCode: number): string {
  try {
    const payload = JSON.parse(body) as { detail?: string };
    if (typeof payload.detail === 'string' && payload.detail.length > 0) {
      return payload.detail;
    }
  } catch {
    // Fall through to the HTTP status when the server did not return JSON.
  }

  return `Server rejected the video (HTTP ${statusCode}).`;
}

export async function uploadCapturedVideo(
  video: VideoFile,
  captureId: string,
  orientation: string,
  mirrored: boolean,
  fallbackWidth?: number,
  fallbackHeight?: number,
): Promise<RemoteVideoReceipt> {
  if (!REMOTE_INFERENCE_BASE_URL) {
    throw new Error(
      'Set EXPO_PUBLIC_REMOTE_INFERENCE_URL to the server LAN address before sending a recording.',
    );
  }

  const form = new FormData();
  form.append('video', {
    uri: toFileUri(video.path),
    name: `${captureId}.mp4`,
    type: 'video/mp4',
  } as unknown as Blob);
  form.append('captureId', captureId);
  const sourceWidth = video.width > 0 ? video.width : fallbackWidth;
  const sourceHeight = video.height > 0 ? video.height : fallbackHeight;
  if (sourceWidth && sourceWidth > 0) {
    form.append('sourceWidth', String(sourceWidth));
  }
  if (sourceHeight && sourceHeight > 0) {
    form.append('sourceHeight', String(sourceHeight));
  }
  form.append('durationSeconds', String(video.duration));
  form.append('orientation', orientation);
  form.append('mirrored', String(mirrored));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${REMOTE_INFERENCE_BASE_URL}/v1/videos`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The video upload timed out after 120 seconds. Check the server and Wi-Fi connection.',
      );
    }
    throw new Error(
      'Could not reach the remote server while uploading the video.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await response.text();
  if (!response.ok) {
    throw new Error(readErrorMessage(body, response.status));
  }

  try {
    return JSON.parse(body) as RemoteVideoReceipt;
  } catch {
    throw new Error('The server returned an invalid video receipt.');
  }
}
