/**
 * Location-related Firestore operations.
 */
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    arrayRemove,
    FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { AccessibilityLocation, Media } from '../../types/accessibility';
import { LocationData } from '../../types/location';
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS } from '../../constants';

const db = getFirestore();

export const LOCATIONS_COLLECTION = 'locations';

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function addLocation(
    location: Partial<AccessibilityLocation>,
): Promise<AccessibilityLocation> {
    const docRef = await addDoc(collection(db, LOCATIONS_COLLECTION), {
        ...location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...location,
        createdAt: Date.now(),
    } as AccessibilityLocation;
}

export async function getLocations(): Promise<AccessibilityLocation[]> {
    const snapshot = await getDocs(
        query(
            collection(db, LOCATIONS_COLLECTION),
            orderBy('createdAt', 'desc'),
        ),
    );
    return snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
    })) as AccessibilityLocation[];
}

export async function getLocationById(
    id: string,
): Promise<AccessibilityLocation | null> {
    const docSnap = await getDoc(doc(db, LOCATIONS_COLLECTION, id));
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as AccessibilityLocation;
    }
    return null;
}

export async function updateLocation(
    id: string,
    data: Partial<AccessibilityLocation> | { [key: string]: any },
) {
    await updateDoc(doc(db, LOCATIONS_COLLECTION, id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
    return { id, ...data };
}

export async function deleteLocation(id: string): Promise<boolean> {
    await deleteDoc(doc(db, LOCATIONS_COLLECTION, id));
    return true;
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────

export async function searchLocationsByName(
    name: string,
): Promise<AccessibilityLocation[]> {
    const snapshot = await getDocs(
        query(
            collection(db, LOCATIONS_COLLECTION),
            where('name', '>=', name),
            where('name', '<=', name + '\uf8ff'),
            limit(10),
        ),
    );
    return snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
    })) as AccessibilityLocation[];
}

export async function searchLocationsByText(
    searchText: string,
    limitCount: number = 20,
): Promise<AccessibilityLocation[]> {
    if (!searchText.trim()) return [];
    const lowerSearchText = searchText.toLowerCase();
    const snapshot = await getDocs(
        query(
            collection(db, LOCATIONS_COLLECTION),
            orderBy('name'),
            limit(limitCount * 2),
        ),
    );
    return snapshot.docs
        .map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
            id: docSnap.id,
            ...docSnap.data(),
        }))
        .filter((loc: any) => loc.name?.toLowerCase().includes(lowerSearchText))
        .slice(0, limitCount) as AccessibilityLocation[];
}

// ─── GEO ─────────────────────────────────────────────────────────────────────

export async function getLocationsByBounds(
    northEast: { latitude: number; longitude: number },
    southWest: { latitude: number; longitude: number },
    limitCount: number = 50,
): Promise<AccessibilityLocation[]> {
    const snapshot = await getDocs(
        query(
            collection(db, LOCATIONS_COLLECTION),
            where('latitude', '>=', southWest.latitude),
            where('latitude', '<=', northEast.latitude),
            limit(limitCount),
        ),
    );
    return snapshot.docs
        .map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
            id: docSnap.id,
            ...docSnap.data(),
        }))
        .filter(
            (loc: any) =>
                loc.longitude >= southWest.longitude &&
                loc.longitude <= northEast.longitude,
        ) as AccessibilityLocation[];
}

export async function getLocationsNearPoint(
    latitude: number,
    longitude: number,
    radiusInKm: number = 10,
    limitCount: number = 20,
): Promise<AccessibilityLocation[]> {
    const latDelta = radiusInKm / 111;
    const lngDelta =
        radiusInKm / (111 * Math.cos((latitude * Math.PI) / 180));
    return getLocationsByBounds(
        { latitude: latitude + latDelta, longitude: longitude + lngDelta },
        { latitude: latitude - latDelta, longitude: longitude - lngDelta },
        limitCount,
    );
}

// ─── MEDIA ───────────────────────────────────────────────────────────────────

export async function removeMediaReferenceFromLocation(
    locationId: string,
    media: Media,
): Promise<boolean> {
    await updateDoc(doc(db, LOCATIONS_COLLECTION, locationId), {
        images: arrayRemove(media),
    });
    return true;
}

// ─── DATA CONVERSION ─────────────────────────────────────────────────────────

export function convertFirestoreToLocationData(
    firestoreLocation: AccessibilityLocation,
    categoryFilter: number,
): LocationData {
    const categoryName = CATEGORY_OPTIONS[categoryFilter]?.label || '';
    const categoryData = firestoreLocation.categories?.[categoryName];
    const severityLevel = categoryData?.severity;
    const details = categoryData ? categoryData.details : '';
    const severityOption =
        SEVERITY_OPTIONS.find(opt => opt.level === severityLevel) ||
        SEVERITY_OPTIONS[SEVERITY_OPTIONS.length - 1];

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
