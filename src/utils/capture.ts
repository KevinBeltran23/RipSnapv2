/**
 * Capture utilities: save photos, videos, and detection metadata locally.
 * Uses expo-file-system/legacy for Expo SDK 54 compatibility.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform, Alert } from 'react-native';

/** Base directory for all capture data. */
const CAPTURE_DIR = `${FileSystem.documentDirectory}captures/`;

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/** Generate a session ID from current timestamp. */
export function generateSessionId(): string {
  const now = new Date();
  const p = (n: number, len = 2) => String(n).padStart(len, '0');
  return `capture_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

/** Copy a media file into the session directory. Returns the destination URI. */
export async function saveMediaFile(
  sourcePath: string,
  sessionId: string,
  filename: string,
): Promise<string> {
  const sessionDir = `${CAPTURE_DIR}${sessionId}/`;
  await ensureDir(sessionDir);
  const dest = `${sessionDir}${filename}`;
  const src = sourcePath.startsWith('file://')
    ? sourcePath
    : `file://${sourcePath}`;
  await FileSystem.copyAsync({ from: src, to: dest });
  return dest;
}

/** Save a JSON metadata file for the session. Returns the destination URI. */
export async function saveMetadataFile(
  sessionId: string,
  metadata: object,
): Promise<string> {
  const sessionDir = `${CAPTURE_DIR}${sessionId}/`;
  await ensureDir(sessionDir);
  const dest = `${sessionDir}metadata.json`;
  await FileSystem.writeAsStringAsync(dest, JSON.stringify(metadata, null, 2));
  return dest;
}

/** Share a file via the native share sheet. */
export async function shareFile(fileUri: string): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ url: fileUri });
  } else {
    await Share.share({ message: fileUri });
  }
}

/** Share both media and metadata for a session. */
export async function shareSession(
  mediaUri: string,
  metadataUri: string,
): Promise<void> {
  // Share media first
  await shareFile(mediaUri);

  // Offer to share metadata
  Alert.alert('Share Metadata?', 'Also share the detection metadata JSON?', [
    { text: 'No', style: 'cancel' },
    { text: 'Share', onPress: () => shareFile(metadataUri) },
  ]);
}
