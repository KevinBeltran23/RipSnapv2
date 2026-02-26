import {
  getStorage,
  ref,
  getDownloadURL,
  listAll,
  deleteObject,
  getMetadata,
} from '@react-native-firebase/storage';
import { Platform } from 'react-native';

const storage = getStorage();

// Upload any media file (image, pdf, video)
export const uploadMedia = async (
  uri: string,
  locationId: string,
  categoryName: string,
  mediaType: 'image' | 'pdf' | 'video' = 'image',
) => {
  try {
    // Convert file path for Android if needed
    const filePath =
      Platform.OS === 'android' ? uri : uri.replace('file://', '');

    if (!locationId || !categoryName) {
      throw new Error(
        'A valid locationId and categoryName are required to upload media.',
      );
    }

    // Generate a unique filename to prevent overwrites
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = uri.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const uploadPath = `locations/${locationId}/${categoryName}/${fileName}`;

    // Create a reference and upload
    const storageRef = ref(storage, uploadPath);
    await storageRef.putFile(filePath);
    const url = await getDownloadURL(storageRef);

    return {
      url,
      path: uploadPath,
      type: mediaType,
      name: fileName,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Download media from Firebase Storage
export const downloadMedia = async (url: string, localPath: string) => {
  try {
    // ref() accepts gs:// and https:// URLs directly
    const storageRef = ref(storage, url);
    await storageRef.writeToFile(localPath);
    return localPath;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Get all media for a location
/**
 * @deprecated Use getLocationMediaByCategory instead.
 */
export const getLocationMedia = async (locationId: string) => {
  try {
    console.warn(
      'DEPRECATED: getLocationMedia is called. Please switch to getLocationMediaByCategory.',
    );
    const storageRef = ref(storage, `locations/${locationId}`);
    const result = await listAll(storageRef);

    const mediaItems = await Promise.all(
      result.items.map(async item => {
        const url = await getDownloadURL(item);
        const metadata = await getMetadata(item);

        let type: 'image' | 'pdf' | 'video' | 'unknown' = 'unknown';
        if (metadata.contentType?.includes('image')) type = 'image';
        else if (metadata.contentType?.includes('pdf')) type = 'pdf';
        else if (metadata.contentType?.includes('video')) type = 'video';

        return {
          url,
          path: item.fullPath,
          type,
          name: item.name,
          timeCreated: metadata.timeCreated,
          size: metadata.size,
        };
      }),
    );

    return mediaItems;
  } catch (error) {
    console.error('Error getting location media:', error);
    return [];
  }
};

// Get media for a specific category within a location
export const getLocationMediaByCategory = async (
  locationId: string,
  categoryName: string,
) => {
  try {
    const storageRef = ref(storage, `locations/${locationId}/${categoryName}`);
    const result = await listAll(storageRef);

    const mediaItems = await Promise.all(
      result.items.map(async item => {
        const url = await getDownloadURL(item);
        const metadata = await getMetadata(item);

        let type: 'image' | 'pdf' | 'video' | 'unknown' = 'unknown';
        if (metadata.contentType?.includes('image')) type = 'image';
        else if (metadata.contentType?.includes('pdf')) type = 'pdf';
        else if (metadata.contentType?.includes('video')) type = 'video';

        return {
          url,
          path: item.fullPath,
          type,
          name: item.name,
          timeCreated: metadata.timeCreated,
          size: metadata.size,
        };
      }),
    );

    return mediaItems;
  } catch (error) {
    console.error(`Error getting media for category ${categoryName}:`, error);
    return [];
  }
};

// Delete media from Firebase Storage
export const deleteMediaFromStorage = async (mediaPath: string) => {
  try {
    const storageRef = ref(storage, mediaPath);
    await deleteObject(storageRef);
    console.log('Media successfully deleted from Storage.');
    return true;
  } catch (error) {
    console.error('Error deleting media from Storage:', error);
    throw error;
  }
};
