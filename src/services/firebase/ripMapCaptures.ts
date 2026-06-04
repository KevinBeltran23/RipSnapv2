import {
  addDoc,
  collection,
  FirebaseFirestoreTypes,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import type { RipCaptureMapRecord } from '../../utils/ripMapPoints';
import type { RipCoordinate } from '../../types/ripMap';

export const RIP_CAPTURES_COLLECTION = 'ripsnap_captures';
const DEFAULT_MAP_CAPTURE_LIMIT = 250;

const db = getFirestore();

export async function getRipMapCaptureRecords(
  limitCount: number = DEFAULT_MAP_CAPTURE_LIMIT,
): Promise<RipCaptureMapRecord[]> {
  const snapshot = await getDocs(
    query(
      collection(db, RIP_CAPTURES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    ),
  );

  return snapshot.docs.map(
    (docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }),
  ) as RipCaptureMapRecord[];
}

export interface CreateRipMapUploadParams {
  userId: string;
  title: string;
  notes: string;
  coordinate: RipCoordinate;
}

export async function createRipMapUploadRecord({
  userId,
  title,
  notes,
  coordinate,
}: CreateRipMapUploadParams): Promise<string> {
  const docRef = await addDoc(collection(db, RIP_CAPTURES_COLLECTION), {
    userId,
    title: title.trim(),
    notes: notes.trim(),
    captureType: 'unknown',
    location: {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      source: 'manual_map_pin',
      capturedAt: new Date().toISOString(),
    },
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}
