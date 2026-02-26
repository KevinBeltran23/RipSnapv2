import { useMemo } from 'react';
import { useMapUI } from '../contexts/MapUIContext';
import { useLocationsQuery } from '../services/store/locationQueries';
import { CATEGORY_OPTIONS } from '../config/constants';
import { convertFirestoreToLocationData } from '../services/firebase/locations';
import { LocationData } from '../types/location';

export function useFilteredLocations() {
  const { data: rawLocations = [], isLoading } = useLocationsQuery();
  const { categoryFilter, severityFilter } = useMapUI();

  // 1. Convert firestore format to specific UI LocationData
  const locations: LocationData[] = useMemo(() => {
    return rawLocations.map(raw =>
      convertFirestoreToLocationData(raw, categoryFilter),
    );
  }, [rawLocations, categoryFilter]);

  // 2. Further filter out mismatched severity or completely empty categories
  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const categoryName = CATEGORY_OPTIONS[categoryFilter]?.label;
      const categoryData = location.categories?.[categoryName];
      if (!categoryData) return false;

      if (severityFilter !== null && categoryData.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [locations, categoryFilter, severityFilter]);

  return { locations, filteredLocations, isLoading };
}
