import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LocationData } from '../../types/location';
import { useMapUI } from '../../contexts/MapUIContext';
import { convertFirestoreToLocationData } from '../../services/firebase/locations';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { useSearchQuery } from '../../services/store/searchQueries';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchBarProps {
  onSelectLocation?: (location: LocationData) => void;
  placeholder?: string;
  initialValue?: string;
  showResults?: boolean;
  onTextChange?: (text: string) => void;
}

function SearchBar({
  onSelectLocation,
  placeholder = 'Search locations...',
  initialValue = '',
  showResults = true,
  onTextChange,
}: SearchBarProps) {
  const { categoryFilter } = useMapUI();
  const [searchQuery, setSearchQuery] = useState(initialValue);

  // Debounce the input before hitting our cache/store
  const debouncedSearchTerm = useDebounce(searchQuery, 300);

  // Call TanStack query using the debounced query
  const { data: rawResults = [] } = useSearchQuery(debouncedSearchTerm);

  // Map Firestore response cleanly into filtered UI data
  const searchResults = React.useMemo(() => {
    if (!debouncedSearchTerm.trim()) return [];
    return rawResults.map(loc =>
      convertFirestoreToLocationData(loc, categoryFilter),
    );
  }, [rawResults, categoryFilter, debouncedSearchTerm]);

  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  useEffect(() => {
    setSearchQuery(initialValue);
  }, [initialValue]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (onTextChange) onTextChange(text);
  };

  const handleSelectLocation = (location: LocationData) => {
    setSearchQuery(location.name);
    if (onSelectLocation) onSelectLocation(location);
  };

  const s = StyleSheet.create({
    container: {
      marginBottom: scaleHeight(16),
      position: 'relative',
      zIndex: 100,
    },
    input: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(12),
      fontSize: scaleFont(16),
      borderWidth: proportionalSize(1),
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    results: {
      maxHeight: scaleHeight(200),
      backgroundColor: colors.background,
      borderWidth: proportionalSize(1),
      borderColor: colors.border,
      borderRadius: proportionalSize(8),
      position: 'absolute',
      top: scaleHeight(48),
      left: 0,
      right: 0,
      zIndex: 101,
    },
    resultItem: {
      paddingVertical: scaleHeight(12),
      paddingHorizontal: proportionalSize(12),
      borderBottomWidth: proportionalSize(1),
      borderBottomColor: colors.border,
    },
    resultName: {
      fontSize: scaleFont(16),
      fontWeight: '500',
      color: colors.textPrimary,
    },
  });

  return (
    <View style={s.container}>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {showResults && searchResults.length > 0 && (
        <ScrollView
          style={s.results}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {searchResults.map(item => (
            <TouchableOpacity
              key={item.id}
              style={s.resultItem}
              onPress={() => handleSelectLocation(item)}
            >
              <Text style={s.resultName}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default SearchBar;
