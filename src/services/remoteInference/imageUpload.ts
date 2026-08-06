import type { PhotoFile } from 'react-native-vision-camera';
import { REMOTE_INFERENCE_BASE_URL } from '../../config/remoteInference';

const REQUEST_TIMEOUT_MS = 15_000;

export interface RemoteImageReceipt {
  imageId: string;
  captureId: string | null;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  receivedAt: string;
  sourceWidth: number | null;
  sourceHeight: number | null;
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

  return `Server rejected the image (HTTP ${statusCode}).`;
}

export async function uploadCapturedImage(
  photo: PhotoFile,
  captureId: string,
): Promise<RemoteImageReceipt> {
  if (!REMOTE_INFERENCE_BASE_URL) {
    throw new Error(
      'Set EXPO_PUBLIC_REMOTE_INFERENCE_URL to the server LAN address before sending a capture.',
    );
  }

  const form = new FormData();
  form.append('image', {
    uri: toFileUri(photo.path),
    name: `${captureId}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('captureId', captureId);
  form.append('sourceWidth', String(photo.width));
  form.append('sourceHeight', String(photo.height));
  form.append('orientation', photo.orientation);
  form.append('mirrored', String(photo.isMirrored));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${REMOTE_INFERENCE_BASE_URL}/v1/images`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The remote server did not respond within 15 seconds. Verify the phone can open the server health URL.',
      );
    }
    throw new Error(
      'Could not reach the remote server. Verify the phone and laptop are on the same Wi-Fi network.',
    );
  } finally {
    clearTimeout(timeoutId);
  }
  const body = await response.text();

  if (!response.ok) {
    throw new Error(readErrorMessage(body, response.status));
  }

  try {
    return JSON.parse(body) as RemoteImageReceipt;
  } catch {
    throw new Error('The server returned an invalid image receipt.');
  }
}
