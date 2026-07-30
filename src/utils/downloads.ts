import { saveDocuments } from '@react-native-documents/picker';
import * as FileSystem from 'expo-file-system/legacy';

interface SaveFileOptions {
  fileName: string;
  mimeType: string;
}

const sanitizeFileName = (fileName: string): string => {
  const sanitized = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '');

  return sanitized || 'ripsnap-download';
};

const getCacheUri = (fileName: string): string => {
  if (!FileSystem.cacheDirectory) {
    throw new Error('Device storage is not available.');
  }

  return `${FileSystem.cacheDirectory}${sanitizeFileName(fileName)}`;
};

const saveLocalFile = async (
  sourceUri: string,
  { fileName, mimeType }: SaveFileOptions,
): Promise<void> => {
  try {
    const result = await saveDocuments({
      sourceUris: [sourceUri],
      mimeType,
      fileName: sanitizeFileName(fileName),
      copy: true,
    });

    if (result[0]?.error) {
      throw new Error('The file could not be saved.');
    }
  } finally {
    await FileSystem.deleteAsync(sourceUri, { idempotent: true }).catch(
      () => undefined,
    );
  }
};

export async function saveRemoteFile(
  url: string,
  options: SaveFileOptions,
): Promise<void> {
  const localUri = getCacheUri(options.fileName);
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
    const download = await FileSystem.downloadAsync(url, localUri);

    if (download.status < 200 || download.status >= 300) {
      throw new Error('The file could not be downloaded.');
    }

    await saveLocalFile(download.uri, options);
  } catch (error) {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(
      () => undefined,
    );
    throw error;
  }
}

export async function saveTextFile(
  content: string,
  options: SaveFileOptions,
): Promise<void> {
  const localUri = getCacheUri(options.fileName);
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
    await FileSystem.writeAsStringAsync(localUri, content);
    await saveLocalFile(localUri, options);
  } catch (error) {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(
      () => undefined,
    );
    throw error;
  }
}
