import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
    useRef,
    useMemo,
    useEffect,
} from 'react';
import { LocationData } from '../types/location';
import { AccessibilityLocation } from '../types/media';
import {
    searchLocationsByText,
    convertFirestoreToLocationData,
    getLocations,
} from '../services/firebase/locations';
import { useMapUI } from './MapUIContext';
import { CATEGORY_OPTIONS } from '../config/constants';

interface LocationContextType {
    locations: LocationData[];
    filteredLocations: LocationData[];
    selectedLocation: LocationData | null;
    setSelectedLocation: (location: LocationData | null) => void;
    searchLocations: (query: string) => Promise<LocationData[]>;
    addLocalLocation: (location: LocationData) => void;
    userLocation: { latitude: number; longitude: number } | null;
    setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
    isLoadingLocations: boolean;
    firestoreLocationMetadata: Partial<AccessibilityLocation> | null;
    setFirestoreLocationMetadata: (metadata: Partial<AccessibilityLocation> | null) => void;
    clearLocationStates: () => void;
    reloadAllLocations: () => Promise<void>;
    setNewPinnedLocation: (coordinate: { latitude: number; longitude: number } | null) => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

interface LocationProviderProps { children: ReactNode; }

export function LocationProvider({ children }: LocationProviderProps) {
    const [rawLocations, setRawLocations] = useState<AccessibilityLocation[]>([]);
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [firestoreLocationMetadata, setFirestoreLocationMetadata] = useState<Partial<AccessibilityLocation> | null>(null);

    const { categoryFilter, severityFilter } = useMapUI();
    const loadingRef = useRef(false);

    const reloadAllLocations = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setIsLoadingLocations(true);
        try {
            const fetched = await getLocations();
            setRawLocations(fetched);
        } catch (error) {
            console.error('Error fetching raw locations:', error);
        } finally {
            loadingRef.current = false;
            setIsLoadingLocations(false);
        }
    }, []);

    useEffect(() => { reloadAllLocations(); }, [reloadAllLocations]);

    useEffect(() => {
        setLocations(rawLocations.map(raw => convertFirestoreToLocationData(raw, categoryFilter)));
    }, [rawLocations, categoryFilter]);

    const filteredLocations = useMemo(() => {
        return locations.filter(location => {
            const categoryName = CATEGORY_OPTIONS[categoryFilter].label;
            const categoryData = location.categories?.[categoryName];
            if (!categoryData) return false;
            if (severityFilter !== null && categoryData.severity !== severityFilter) return false;
            return true;
        });
    }, [locations, categoryFilter, severityFilter]);

    const setNewPinnedLocation = useCallback(
        (coordinate: { latitude: number; longitude: number } | null) => {
            if (!coordinate) {
                if (selectedLocation?.id?.startsWith('temp-')) {
                    setSelectedLocation(null);
                    setFirestoreLocationMetadata(null);
                }
                return;
            }
            const preservedName = firestoreLocationMetadata?.name || '';
            const preservedDescription = firestoreLocationMetadata?.description || '';
            const preservedImages = firestoreLocationMetadata?.images || [];
            setSelectedLocation({
                id: `temp-${Date.now()}`,
                name: preservedName,
                severity: 'unknown_accessibility',
                severityColor: 'unknownAccessibility',
                accessibilityDetails: preservedDescription,
                coordinates: coordinate,
                galleryImages: preservedImages,
                categories: {},
            });
            setFirestoreLocationMetadata({
                name: preservedName,
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                description: preservedDescription,
                images: preservedImages,
            });
        },
        [selectedLocation, firestoreLocationMetadata],
    );

    const clearLocationStates = useCallback(() => {
        setSelectedLocation(null);
        setFirestoreLocationMetadata(null);
        if (selectedLocation?.id?.startsWith('temp-')) setNewPinnedLocation(null);
    }, [selectedLocation, setNewPinnedLocation]);

    const searchLocations = useCallback(async (query: string): Promise<LocationData[]> => {
        if (!query.trim()) return [];
        try {
            const results = await searchLocationsByText(query);
            return results.map(loc => convertFirestoreToLocationData(loc, categoryFilter));
        } catch (error) {
            console.error('Error searching locations:', error);
            return [];
        }
    }, [categoryFilter]);

    const addLocalLocation = (location: LocationData) => {
        setLocations(prev => [...prev, location]);
    };

    return (
        <LocationContext.Provider value={{
            locations, filteredLocations, selectedLocation, setSelectedLocation,
            searchLocations, addLocalLocation, userLocation, setUserLocation,
            isLoadingLocations, firestoreLocationMetadata, setFirestoreLocationMetadata,
            clearLocationStates, reloadAllLocations, setNewPinnedLocation,
        }}>
            {children}
        </LocationContext.Provider>
    );
}

export const useLocationContext = () => {
    const context = useContext(LocationContext);
    if (!context) throw new Error('useLocationContext must be used within a LocationProvider');
    return context;
};
