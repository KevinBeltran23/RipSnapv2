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
import { AccessibilityLocation } from '../types/accessibility';
import {
  searchLocationsByText,
  convertFirestoreToLocationData,
  getLocations,
} from '../services/firebase/firestore';
import { useMapUI } from './MapUIContext';
import { CATEGORY_OPTIONS } from '../constants';

// Define the context type
interface LocationContextType {
  locations: LocationData[]; // This will now be the processed data
  filteredLocations: LocationData[];
  selectedLocation: LocationData | null;
  setSelectedLocation: (location: LocationData | null) => void;
  searchLocations: (query: string) => Promise<LocationData[]>;
  addLocalLocation: (location: LocationData) => void;
  userLocation: { latitude: number; longitude: number } | null;
  setUserLocation: (
    location: { latitude: number; longitude: number } | null,
  ) => void;
  isLoadingLocations: boolean;
  firestoreLocationMetadata: Partial<AccessibilityLocation> | null;
  setFirestoreLocationMetadata: (
    metadata: Partial<AccessibilityLocation> | null,
  ) => void;
  clearLocationStates: () => void;
  reloadAllLocations: () => Promise<void>;
  setNewPinnedLocation: (
    coordinate: {
      latitude: number;
      longitude: number;
    } | null,
  ) => void;
}

// Create the context with a default value
const LocationContext = createContext<LocationContextType | null>(null);

// Provider component
interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  // NEW: State for the raw, unprocessed data from Firestore
  const [rawLocations, setRawLocations] = useState<AccessibilityLocation[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [firestoreLocationMetadata, setFirestoreLocationMetadata] =
    useState<Partial<AccessibilityLocation> | null>(null);

  const { categoryFilter, severityFilter } = useMapUI();

  const loadingRef = useRef(false);

  // 1. DATA FETCHING: This function ONLY fetches raw data. No filter dependencies.
  const reloadAllLocations = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingLocations(true);
    try {
      console.log('Fetching all raw locations from Firestore...');
      const fetchedRawLocations = await getLocations();
      setRawLocations(fetchedRawLocations);
      console.log(
        'Successfully fetched raw locations:',
        fetchedRawLocations.length,
      );
    } catch (error) {
      console.error('Error fetching raw locations:', error);
    } finally {
      loadingRef.current = false;
      setIsLoadingLocations(false);
    }
  }, []); // Empty dependency array ensures this is created once.

  // This useEffect calls the fetch function ONCE on component mount.
  useEffect(() => {
    reloadAllLocations();
  }, [reloadAllLocations]);

  // 2. DATA PROCESSING: This re-processes the data on the client whenever the category filter changes. NO backend call.
  useEffect(() => {
    console.log(
      `Reprocessing ${rawLocations.length} locations for category filter: ${categoryFilter}`,
    );
    const processedLocations = rawLocations.map(rawLoc =>
      convertFirestoreToLocationData(rawLoc, categoryFilter),
    );
    setLocations(processedLocations);
  }, [rawLocations, categoryFilter]);

  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const categoryName = CATEGORY_OPTIONS[categoryFilter].label;
      const categoryData = location.categories?.[categoryName];

      if (!categoryData) {
        return false;
      }

      if (severityFilter !== null && categoryData.severity !== severityFilter) {
        return false;
      }

      return true;
    });
  }, [locations, categoryFilter, severityFilter]);

  // Define setNewPinnedLocation first
  const setNewPinnedLocation = useCallback(
    (
      coordinate: {
        latitude: number;
        longitude: number;
      } | null,
    ) => {
      if (!coordinate) {
        if (selectedLocation && selectedLocation.id.startsWith('temp-')) {
          setSelectedLocation(null);
          setFirestoreLocationMetadata(null);
        }
        return;
      }

      // Crucial change: Preserve the existing name if the user has already typed one.
      // The name comes from firestoreLocationMetadata which is updated by PopupSheet's SearchBar.
      const preservedName = firestoreLocationMetadata?.name || '';
      const preservedDescription = firestoreLocationMetadata?.description || '';
      const preservedImages = firestoreLocationMetadata?.images || [];

      const newLocation: LocationData = {
        id: `temp-${Date.now()}`,
        name: preservedName, // Use the preserved name
        severity: 'unknown_accessibility', // Default severity for new pins
        severityColor: 'unknownAccessibility', // Default color for new pins
        accessibilityDetails: preservedDescription, // Preserve description
        coordinates: coordinate,
        galleryImages: preservedImages, // Preserve images
        categories: {}, // Categories are set during submission, not pin placement
      };

      const newFirestoreMetadata: Partial<AccessibilityLocation> = {
        name: preservedName, // Use the preserved name
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        description: preservedDescription, // Preserve description
        images: preservedImages, // Preserve images
      };

      setSelectedLocation(newLocation);
      setFirestoreLocationMetadata(newFirestoreMetadata);
    },
    // Add all states/setters that the useCallback depends on to prevent stale closures
    [
      selectedLocation,
      firestoreLocationMetadata,
      setSelectedLocation,
      setFirestoreLocationMetadata,
    ],
  );

  // Now define clearLocationStates, which depends on setNewPinnedLocation
  const clearLocationStates = useCallback(() => {
    setSelectedLocation(null);
    setFirestoreLocationMetadata(null);
    // Also clear any temporary pin
    if (
      selectedLocation &&
      selectedLocation.id &&
      selectedLocation.id.startsWith('temp-')
    ) {
      setNewPinnedLocation(null);
    }
  }, [
    selectedLocation,
    setNewPinnedLocation,
    setSelectedLocation,
    setFirestoreLocationMetadata,
  ]);

  // Updated search function to use Firestore
  const searchLocations = useCallback(
    async (query: string): Promise<LocationData[]> => {
      if (!query.trim()) return [];
      try {
        const firestoreLocations = await searchLocationsByText(query);
        // When converting search results, we pass the current category filter.
        return firestoreLocations.map(loc =>
          convertFirestoreToLocationData(loc, categoryFilter),
        );
      } catch (error) {
        console.error('Error searching locations:', error);
        return [];
      }
    },
    [categoryFilter], // Dependency ensures search results are processed correctly if filter changes.
  );

  // Add a new location
  const addLocalLocation = (location: LocationData) => {
    setLocations(prevLocations => [...prevLocations, location]);
  };

  return (
    <LocationContext.Provider
      value={{
        locations,
        filteredLocations,
        selectedLocation,
        setSelectedLocation,
        searchLocations,
        addLocalLocation,
        userLocation,
        setUserLocation,
        isLoadingLocations,
        firestoreLocationMetadata,
        setFirestoreLocationMetadata,
        clearLocationStates,
        reloadAllLocations,
        setNewPinnedLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

// Custom hook to use the location context
export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error(
      'useLocationContext must be used within a LocationProvider',
    );
  }
  return context;
};
