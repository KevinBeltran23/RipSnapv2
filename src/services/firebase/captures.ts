/**
 * Firebase service for RipSnap detection captures.
 *
 * Storage path:  ripsnap_captures/{userId}/{sessionId}/media.{ext}
 *                ripsnap_captures/{userId}/{sessionId}/metadata.json
 * Firestore:     ripsnap_captures/{docId}
 *
 * Kept separate from the legacy accessibility location routes.
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
import * as FileSystem from 'expo-file-system/legacy';

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
  notes: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
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
    notes,
    locationName,
    latitude,
    longitude,
  } = params;

  const mediaExt = captureType === 'video' ? 'mp4' : 'jpg';
  const mediaStoragePath = `${CAPTURES_STORAGE_PATH}/${userId}/${sessionId}/media.${mediaExt}`;
  const metaStoragePath = `${CAPTURES_STORAGE_PATH}/${userId}/${sessionId}/metadata.json`;

  // Upload media file
  const mediaFilePath =
    Platform.OS === 'android'
      ? mediaUri
      : mediaUri.replace('file://', '');
  const mediaRef = ref(storage, mediaStoragePath);
  await mediaRef.putFile(mediaFilePath);
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
    mediaUrl,
    metadataUrl,
    mediaStoragePath,
    metaStoragePath,
    notes: notes.trim(),
    locationName: locationName.trim(),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    createdAt: serverTimestamp(),
  });

  return {
    mediaUrl,
    metadataUrl,
    firestoreId: docRef.id,
  };
}
