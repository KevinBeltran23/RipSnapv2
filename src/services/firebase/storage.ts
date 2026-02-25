import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';

// Upload any media file (image, pdf, video)
export const uploadMedia = async (
  uri: string,
  locationId: string,
  categoryName: string, // <-- New parameter
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
    // Construct the new path with the category subfolder
    const uploadPath = `locations/${locationId}/${categoryName}/${fileName}`;

    // Create a reference to the file in Firebase Storage
    const reference = storage().ref(uploadPath);

    // Upload the file
    await reference.putFile(filePath);

    // Get the download URL
    const url = await reference.getDownloadURL();

    // Return the result
    return {
      url,
      path: uploadPath,
      type: mediaType,
      name: fileName, // Include name for consistency
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Download media from Firebase Storage
export const downloadMedia = async (url: string, localPath: string) => {
  try {
    // Get the reference from the URL
    const reference = storage().refFromURL(url);

    // Download the file to the local path
    await reference.writeToFile(localPath);

    return localPath;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Get all media for a location
/**
 * @deprecated This function is no longer compatible with the categorized folder
 * structure. Use getLocationMediaByCategory instead.
 */
export const getLocationMedia = async (locationId: string) => {
  try {
    console.warn(
      'DEPRECATED: getLocationMedia is called. Please switch to getLocationMediaByCategory.',
    );
    console.log('Fetching media for location ID:', locationId);

    // Get a reference to the location's folder
    const reference = storage().ref(`locations/${locationId}`);

    // List all items in the folder
    const result = await reference.listAll();
    console.log('Found items in location folder:', result.items.length);

    // Get download URLs for all items
    const mediaItems = await Promise.all(
      result.items.map(async item => {
        console.log('Processing item:', item.fullPath);
        const url = await item.getDownloadURL();
        const metadata = await item.getMetadata();

        // Determine media type from content type
        let type: 'image' | 'pdf' | 'video' | 'unknown' = 'unknown';
        if (metadata.contentType?.includes('image')) {
          type = 'image';
        } else if (metadata.contentType?.includes('pdf')) {
          type = 'pdf';
        } else if (metadata.contentType?.includes('video')) {
          type = 'video';
        }

        console.log('Item type:', type, 'Content-Type:', metadata.contentType);

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

    console.log('Processed media items:', mediaItems.length);
    return mediaItems;
  } catch (error) {
    console.error('Error getting location media:', error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

// NEW FUNCTION: Get media for a specific category within a location
export const getLocationMediaByCategory = async (
  locationId: string,
  categoryName: string,
) => {
  try {
    console.log(
      `Fetching media for location ID: ${locationId}, Category: ${categoryName}`,
    );

    // Get a reference to the location's category subfolder
    const reference = storage().ref(`locations/${locationId}/${categoryName}`);

    // List all items in the folder
    const result = await reference.listAll();
    console.log(
      `Found ${result.items.length} items in category folder: ${categoryName}`,
    );

    // Get download URLs for all items
    const mediaItems = await Promise.all(
      result.items.map(async item => {
        const url = await item.getDownloadURL();
        const metadata = await item.getMetadata();

        // Determine media type from content type
        let type: 'image' | 'pdf' | 'video' | 'unknown' = 'unknown';
        if (metadata.contentType?.includes('image')) {
          type = 'image';
        } else if (metadata.contentType?.includes('pdf')) {
          type = 'pdf';
        } else if (metadata.contentType?.includes('video')) {
          type = 'video';
        }

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

    console.log('Processed media items:', mediaItems.length);
    return mediaItems;
  } catch (error) {
    console.error(`Error getting media for category ${categoryName}:`, error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

// NEW FUNCTION: Delete media from Firebase Storage
export const deleteMediaFromStorage = async (mediaPath: string) => {
  try {
    console.log('Deleting media from Storage:', mediaPath);
    const reference = storage().ref(mediaPath);
    await reference.delete();
    console.log('Media successfully deleted from Storage.');
    return true;
  } catch (error) {
    console.error('Error deleting media from Storage:', error);
    throw error;
  }
};
