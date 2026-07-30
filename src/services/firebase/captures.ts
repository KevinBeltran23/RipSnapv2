/**
 * Firebase service for RipSnap detection captures.
 *
 * Storage path:  ripsnap_captures/{userId}/{layerId}/{sessionId}/media.{ext}
 *                ripsnap_captures/{userId}/{layerId}/{sessionId}/metadata.json
 * Firestore:     ripsnap_captures/{docId}
 *
 * Capture documents are the source for the MVP RipFinder map layer.
 */
import {
  getStorage,
  ref,
  getDownloadURL,
} from '@react-native-firebase/storage';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import type { CaptureLocationSnapshot } from '../../utils/location';
import { getMediaExtension } from '../../utils/capture';
import type { RipMapLayerId } from '../../types/ripMap';

const storage = getStorage();
const db = getFirestore();

const CAPTURES_COLLECTION = 'ripsnap_captures';
const CAPTURES_STORAGE_PATH = 'ripsnap_captures';

export interface CaptureUploadParams {
  userId: string;
  sessionId: string;
  mediaUri: string;
  metadataUri: string;
  captureType: 'photo' | 'video';
  mediaExtension?: string;
  mediaMimeType?: string;
  layerId: RipMapLayerId;
  title?: string;
  notes: string;
  location: CaptureLocationSnapshot;
}

export interface CaptureUploadResult {
  mediaUrl: string;
  metadataUrl: string;
  firestoreId: string;
}

/**
 * Upload a capture session (media + metadata) to Firebase.
 */
export async function uploadCapture(
  params: CaptureUploadParams,
): Promise<CaptureUploadResult> {
  const {
    userId,
    sessionId,
    mediaUri,
    metadataUri,
    captureType,
    mediaExtension,
    mediaMimeType,
    layerId,
    title,
    notes,
    location,
  } = params;

  const mediaExt =
    mediaExtension ?? getMediaExtension(undefined, mediaMimeType, captureType);
  const mediaStoragePath = `${CAPTURES_STORAGE_PATH}/${userId}/${layerId}/${sessionId}/media.${mediaExt}`;
  const metaStoragePath = `${CAPTURES_STORAGE_PATH}/${userId}/${layerId}/${sessionId}/metadata.json`;

  // Upload media file
  const mediaFilePath =
    Platform.OS === 'android' ? mediaUri : mediaUri.replace('file://', '');
  const mediaRef = ref(storage, mediaStoragePath);
  await mediaRef.putFile(mediaFilePath, {
    contentType: mediaMimeType ?? undefined,
  });
  const mediaUrl = await getDownloadURL(mediaRef);

  // Upload metadata JSON
  const metaFilePath =
    Platform.OS === 'android'
      ? metadataUri
      : metadataUri.replace('file://', '');
  const metaRef = ref(storage, metaStoragePath);
  await metaRef.putFile(metaFilePath);
  const metadataUrl = await getDownloadURL(metaRef);

  // Create Firestore document
  const docRef = await addDoc(collection(db, CAPTURES_COLLECTION), {
    userId,
    sessionId,
    captureType,
    layerId,
    mediaUrl,
    metadataUrl,
    mediaStoragePath,
    metaStoragePath,
    title: title?.trim() || null,
    notes: notes.trim(),
    location,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: serverTimestamp(),
  });

  return {
    mediaUrl,
    metadataUrl,
    firestoreId: docRef.id,
  };
}
