import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SeverityLevel } from '../types/severity';

interface MapUIContextType {
  isAddingLocation: boolean;
  setIsAddingLocation: (isAdding: boolean) => void;
  showDetailsPopup: boolean;
  setShowDetailsPopup: (show: boolean) => void;
  showAddDataPopup: boolean;
  setShowAddDataPopup: (show: boolean) => void;
  isPinPlacementMode: boolean;
  setIsPinPlacementMode: (isPlacing: boolean) => void;
  categoryFilter: number; // No longer nullable
  setCategoryFilter: (category: number) => void;
  severityFilter: SeverityLevel | null;
  setSeverityFilter: (level: SeverityLevel | null) => void;
  clearFilters: () => void;
}

const MapUIContext = createContext<MapUIContextType | null>(null);

export const useMapUI = () => {
  const context = useContext(MapUIContext);
  if (!context) {
    throw new Error('useMapUI must be used within a MapUIProvider');
  }
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
  const [categoryFilter, setCategoryFilter] = useState<number>(0); // Default to the first category
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | null>(
    null,
  );

  // --- Function to clear all filters ---
  const clearFilters = () => {
    setCategoryFilter(0); // Reset to default
    setSeverityFilter(null);
  };

  const value = {
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
  };

  return (
    <MapUIContext.Provider value={value}>{children}</MapUIContext.Provider>
  );
}
