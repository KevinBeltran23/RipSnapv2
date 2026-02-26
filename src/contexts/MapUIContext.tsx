import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { SeverityLevel } from '../types/severity';
import { LocationData } from '../types/location';
import { AccessibilityLocation } from '../types/media';

interface MapUIContextType {
  isAddingLocation: boolean;
  setIsAddingLocation: (isAdding: boolean) => void;
  showDetailsPopup: boolean;
  setShowDetailsPopup: (show: boolean) => void;
  showAddDataPopup: boolean;
  setShowAddDataPopup: (show: boolean) => void;
  isPinPlacementMode: boolean;
  setIsPinPlacementMode: (isPlacing: boolean) => void;
  categoryFilter: number;
  setCategoryFilter: (category: number) => void;
  severityFilter: SeverityLevel | null;
  setSeverityFilter: (level: SeverityLevel | null) => void;
  clearFilters: () => void;

  selectedLocation: LocationData | null;
  setSelectedLocation: (location: LocationData | null) => void;
  userLocation: { latitude: number; longitude: number } | null;
  setUserLocation: (
    location: { latitude: number; longitude: number } | null,
  ) => void;
  firestoreLocationMetadata: Partial<AccessibilityLocation> | null;
  setFirestoreLocationMetadata: (
    metadata: Partial<AccessibilityLocation> | null,
  ) => void;
  clearLocationStates: () => void;
  setNewPinnedLocation: (
    coordinate: { latitude: number; longitude: number } | null,
  ) => void;
}

const MapUIContext = createContext<MapUIContextType | null>(null);

export const useMapUI = () => {
  const context = useContext(MapUIContext);
  if (!context) throw new Error('useMapUI must be used within a MapUIProvider');
  return context;
};

interface MapUIProviderProps {
  children: ReactNode;
}

export function MapUIProvider({ children }: MapUIProviderProps) {
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showAddDataPopup, setShowAddDataPopup] = useState(false);
  const [isPinPlacementMode, setIsPinPlacementMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number>(0);
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | null>(
    null,
  );

  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [firestoreLocationMetadata, setFirestoreLocationMetadata] =
    useState<Partial<AccessibilityLocation> | null>(null);

  const clearFilters = () => {
    setCategoryFilter(0);
    setSeverityFilter(null);
  };

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

  return (
    <MapUIContext.Provider
      value={{
        isAddingLocation,
        setIsAddingLocation,
        showDetailsPopup,
        setShowDetailsPopup,
        showAddDataPopup,
        setShowAddDataPopup,
        isPinPlacementMode,
        setIsPinPlacementMode,
        categoryFilter,
        setCategoryFilter,
        severityFilter,
        setSeverityFilter,
        clearFilters,

        selectedLocation,
        setSelectedLocation,
        userLocation,
        setUserLocation,
        firestoreLocationMetadata,
        setFirestoreLocationMetadata,
        clearLocationStates,
        setNewPinnedLocation,
      }}
    >
      {children}
    </MapUIContext.Provider>
  );
}
