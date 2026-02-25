import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { User } from '../../types/user';
import { AccessibilityLocation, Media } from '../../types/accessibility';
import { LocationData } from '../../types/location';
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS } from '../../constants';

// Collection names as constants to avoid typos
const COLLECTIONS = {
  LOCATIONS: 'locations',
  USERS: 'users',
};

// Helper function to get a user document reference
export function getUserDocumentRef(userId: string) {
  return firestore().collection(COLLECTIONS.USERS).doc(userId);
}

// Add a location to Firestore
export async function addLocation(
  location: Partial<AccessibilityLocation>,
): Promise<AccessibilityLocation> {
  try {
    const docRef = await firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .add({
        ...location,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('Location added with ID:', docRef.id);
    const newLocation: AccessibilityLocation = {
      id: docRef.id,
      ...location,
      createdAt: Date.now(), // Approximate timestamp
    } as AccessibilityLocation;
    return newLocation;
  } catch (error) {
    console.error('Error adding location:', error);
    throw error;
  }
}

// Get all locations from Firestore
export async function getLocations() {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AccessibilityLocation[];
  } catch (error) {
    console.error('Error getting locations:', error);
    throw error;
  }
}

// Get a location by ID
export async function getLocationById(id: string) {
  try {
    const doc = await firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .doc(id)
      .get();

    if (doc.exists()) {
      return { id: doc.id, ...doc.data() } as AccessibilityLocation;
    }
    return null;
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
}

// Update a location
export async function updateLocation(
  id: string,
  data: Partial<AccessibilityLocation> | { [key: string]: any },
) {
  try {
    await firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .doc(id)
      .update({
        ...data,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('Location updated:', id);
    return { id, ...data };
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
}

// Delete a location
export async function deleteLocation(id: string) {
  try {
    await firestore().collection(COLLECTIONS.LOCATIONS).doc(id).delete();
    console.log('Location deleted:', id);
    return true;
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
}

// Search locations by name
export async function searchLocationsByName(name: string) {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .where('name', '>=', name)
      .where('name', '<=', name + '\uf8ff')
      .limit(10)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AccessibilityLocation[];
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

// Convert Firestore location to app LocationData format
export function convertFirestoreToLocationData(
  firestoreLocation: AccessibilityLocation,
  categoryFilter: number,
): LocationData {
  const categoryName = CATEGORY_OPTIONS[categoryFilter]?.label || '';
  const categoryData = firestoreLocation.categories?.[categoryName];

  // The severity is now directly from the category data, or undefined if not present.
  const severityLevel = categoryData?.severity;
  const details = categoryData ? categoryData.details : '';

  // Find the matching severity option, or use a default "unknown" style for the UI
  // This part is for display and doesn't affect the core data
  const severityOption =
    SEVERITY_OPTIONS.find(opt => opt.level === severityLevel) ||
    SEVERITY_OPTIONS[SEVERITY_OPTIONS.length - 1]; // Fallback to 'unknown' for styling

  return {
    id: firestoreLocation.id || '',
    name: firestoreLocation.name || 'Unknown Location',
    // Source of truth from firestore
    categories: firestoreLocation.categories || {},
    // Derived UI data based on the selected category filter
    severity: severityLevel || 'unknown_accessibility', // UI now gets the direct severity, or a default
    severityColor: severityOption.color,
    accessibilityDetails: details,
    // Original coordinates and other fields
    coordinates: {
      latitude: firestoreLocation.latitude,
      longitude: firestoreLocation.longitude,
    },
    googleMapsUrl: `https://maps.google.com/?q=${firestoreLocation.latitude},${firestoreLocation.longitude}`,
    galleryImages: firestoreLocation.images || [],
    analysis: undefined, // ensure all fields are present
    chatOption: undefined,
    media: undefined,
  };
}

// Get locations within a geographic bounding box (for map viewport)
export async function getLocationsByBounds(
  northEast: { latitude: number; longitude: number },
  southWest: { latitude: number; longitude: number },
  limit: number = 50,
) {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .where('latitude', '>=', southWest.latitude)
      .where('latitude', '<=', northEast.latitude)
      .limit(limit)
      .get();

    // Filter by longitude in memory since Firestore doesn't support range queries on multiple fields
    const locations = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (location: any) =>
          location.longitude >= southWest.longitude &&
          location.longitude <= northEast.longitude,
      ) as AccessibilityLocation[];

    return locations;
  } catch (error) {
    console.error('Error getting locations by bounds:', error);
    throw error;
  }
}

// Search locations by name with better text matching
export async function searchLocationsByText(
  searchText: string,
  limit: number = 20,
) {
  try {
    if (!searchText.trim()) {
      return [];
    }

    const lowerSearchText = searchText.toLowerCase();

    // Query for locations where name contains the search text
    // Note: This is a simple implementation. For better search, consider using Algolia or similar
    const snapshot = await firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .orderBy('name')
      .limit(limit * 2) // Get more results to filter locally
      .get();

    const locations = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((location: any) =>
        location.name.toLowerCase().includes(lowerSearchText),
      )
      .slice(0, limit) as AccessibilityLocation[];

    return locations;
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

// Get locations near a specific point (for "nearby" functionality)
export async function getLocationsNearPoint(
  latitude: number,
  longitude: number,
  radiusInKm: number = 10,
  limit: number = 20,
) {
  try {
    // Calculate rough bounding box (this is approximate)
    const latDelta = radiusInKm / 111; // Roughly 111 km per degree of latitude
    const lngDelta = radiusInKm / (111 * Math.cos((latitude * Math.PI) / 180));

    const northEast = {
      latitude: latitude + latDelta,
      longitude: longitude + lngDelta,
    };
    const southWest = {
      latitude: latitude - latDelta,
      longitude: longitude - lngDelta,
    };

    return await getLocationsByBounds(northEast, southWest, limit);
  } catch (error) {
    console.error('Error getting nearby locations:', error);
    throw error;
  }
}

// --- User Profile Functions ---

// Creates a new user profile document in Firestore
export async function createUserProfile(
  user: FirebaseFirestoreTypes.DocumentData,
): Promise<User | null> {
  const userRef = firestore().collection(COLLECTIONS.USERS).doc(user.uid);
  const snapshot = await userRef.get();

  if (snapshot.exists()) {
    // If profile already exists, return it
    return snapshot.data() as User;
  }

  // If it doesn't exist, create it
  const { email, displayName, photoURL } = user;
  const newUserProfile: Omit<User, 'createdAt'> = {
    uid: user.uid,
    displayName: displayName || 'Anonymous User',
    email,
    photoURL: photoURL || null,
    darkMode: false,
    textToSpeech: false,
    colorBlindMode: 'none',
    highContrast: false,
    defaultDisabilityCategory: null,
    isAdmin: false,
    hasAcceptedTerms: false, // Default to false for new users
  };
  try {
    const profileWithTimestamp = {
      ...newUserProfile,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(profileWithTimestamp);
    // Manually construct the full User object to return
    return {
      ...newUserProfile,
      createdAt: new Date(), // Use current date as a stand-in for the server timestamp
    } as User;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error; // Rethrow so it can be caught upstream
  }
}

// Get a user's profile
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const doc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();
    if (doc.exists()) {
      return doc.data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

// Update a user's profile
export async function updateUser(userId: string, data: Partial<User>) {
  try {
    const userRef = firestore().collection(COLLECTIONS.USERS).doc(userId);
    await userRef.update(data);
    console.log('User profile updated for:', userId);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// New function to update only the hasAcceptedTerms field
export async function updateUserTermsAcceptance(
  userId: string,
  hasAccepted: boolean,
) {
  try {
    const userRef = firestore().collection(COLLECTIONS.USERS).doc(userId);
    await userRef.update({ hasAcceptedTerms: hasAccepted });
    console.log(`User ${userId} terms acceptance set to: ${hasAccepted}`);
  } catch (error) {
    console.error('Error updating user terms acceptance:', error);
    throw error;
  }
}

export async function removeMediaReferenceFromLocation(
  locationId: string,
  media: Media,
) {
  try {
    console.log(
      'Removing media reference from Firestore:',
      locationId,
      media.path,
    );
    const locationRef = firestore()
      .collection(COLLECTIONS.LOCATIONS)
      .doc(locationId);
    await locationRef.update({
      images: firestore.FieldValue.arrayRemove(media),
    });
    console.log('Media reference successfully removed from Firestore.');
    return true;
  } catch (error) {
    console.error('Error removing media reference from Firestore:', error);
    throw error;
  }
}
