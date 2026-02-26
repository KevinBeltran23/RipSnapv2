import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayRemove,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { User } from '../../types/user';
import { AccessibilityLocation, Media } from '../../types/accessibility';
import { LocationData } from '../../types/location';
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS } from '../../constants';

const db = getFirestore();

// Collection names as constants to avoid typos
const COLLECTIONS = {
  LOCATIONS: 'locations',
  USERS: 'users',
};

// Helper function to get a user document reference
export function getUserDocumentRef(userId: string) {
  return doc(db, COLLECTIONS.USERS, userId);
}

// Add a location to Firestore
export async function addLocation(
  location: Partial<AccessibilityLocation>,
): Promise<AccessibilityLocation> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
      ...location,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.LOCATIONS), orderBy('createdAt', 'desc')),
    );

    return snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AccessibilityLocation[];
  } catch (error) {
    console.error('Error getting locations:', error);
    throw error;
  }
}

// Get a location by ID
export async function getLocationById(id: string) {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.LOCATIONS, id));

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as AccessibilityLocation;
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
    await updateDoc(doc(db, COLLECTIONS.LOCATIONS, id), {
      ...data,
      updatedAt: serverTimestamp(),
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
    await deleteDoc(doc(db, COLLECTIONS.LOCATIONS, id));
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
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.LOCATIONS),
        where('name', '>=', name),
        where('name', '<=', name + '\uf8ff'),
        limit(10),
      ),
    );

    return snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
      id: docSnap.id,
      ...docSnap.data(),
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
  const severityOption =
    SEVERITY_OPTIONS.find(opt => opt.level === severityLevel) ||
    SEVERITY_OPTIONS[SEVERITY_OPTIONS.length - 1]; // Fallback to 'unknown' for styling

  return {
    id: firestoreLocation.id || '',
    name: firestoreLocation.name || 'Unknown Location',
    categories: firestoreLocation.categories || {},
    severity: severityLevel || 'unknown_accessibility',
    severityColor: severityOption.color,
    accessibilityDetails: details,
    coordinates: {
      latitude: firestoreLocation.latitude,
      longitude: firestoreLocation.longitude,
    },
    googleMapsUrl: `https://maps.google.com/?q=${firestoreLocation.latitude},${firestoreLocation.longitude}`,
    galleryImages: firestoreLocation.images || [],
    analysis: undefined,
    chatOption: undefined,
    media: undefined,
  };
}

// Get locations within a geographic bounding box (for map viewport)
export async function getLocationsByBounds(
  northEast: { latitude: number; longitude: number },
  southWest: { latitude: number; longitude: number },
  limitCount: number = 50,
) {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.LOCATIONS),
        where('latitude', '>=', southWest.latitude),
        where('latitude', '<=', northEast.latitude),
        limit(limitCount),
      ),
    );

    // Filter by longitude in memory since Firestore doesn't support range queries on multiple fields
    const locations = snapshot.docs
      .map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
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
  limitCount: number = 20,
) {
  try {
    if (!searchText.trim()) {
      return [];
    }

    const lowerSearchText = searchText.toLowerCase();

    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.LOCATIONS),
        orderBy('name'),
        limit(limitCount * 2), // Get more results to filter locally
      ),
    );

    const locations = snapshot.docs
      .map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((location: any) =>
        location.name.toLowerCase().includes(lowerSearchText),
      )
      .slice(0, limitCount) as AccessibilityLocation[];

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
  limitCount: number = 20,
) {
  try {
    const latDelta = radiusInKm / 111;
    const lngDelta = radiusInKm / (111 * Math.cos((latitude * Math.PI) / 180));

    const northEast = {
      latitude: latitude + latDelta,
      longitude: longitude + lngDelta,
    };
    const southWest = {
      latitude: latitude - latDelta,
      longitude: longitude - lngDelta,
    };

    return await getLocationsByBounds(northEast, southWest, limitCount);
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
  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data() as User;
  }

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
    hasAcceptedTerms: false,
  };
  try {
    const profileWithTimestamp = {
      ...newUserProfile,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, profileWithTimestamp);
    return {
      ...newUserProfile,
      createdAt: new Date(),
    } as User;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

// Get a user's profile
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (docSnap.exists()) {
      return docSnap.data() as User;
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
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), data as { [key: string]: any });
    console.log('User profile updated for:', userId);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Update only the hasAcceptedTerms field
export async function updateUserTermsAcceptance(
  userId: string,
  hasAccepted: boolean,
) {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      hasAcceptedTerms: hasAccepted,
    });
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
    const locationRef = doc(db, COLLECTIONS.LOCATIONS, locationId);
    await updateDoc(locationRef, {
      images: arrayRemove(media),
    });
    console.log('Media reference successfully removed from Firestore.');
    return true;
  } catch (error) {
    console.error('Error removing media reference from Firestore:', error);
    throw error;
  }
}
