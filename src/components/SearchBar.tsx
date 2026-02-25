import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LocationData } from '../types/location';
import { useLocationContext } from '../services/LocationContext';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

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
  const { searchLocations } = useLocationContext();
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  useEffect(() => {
    setSearchQuery(initialValue);
  }, [initialValue]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (onTextChange) {
      onTextChange(text);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim()) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchLocations(text);
          setSearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectLocation = (location: LocationData) => {
    setSearchQuery(location.name);
    setSearchResults([]);
    if (onSelectLocation) {
      onSelectLocation(location);
    }
  };

  const dynamicStyles = StyleSheet.create({
    searchContainer: {
      marginBottom: scaleHeight(16),
      position: 'relative',
      zIndex: 100,
    },
    searchInput: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(12),
      fontSize: scaleFont(16),
      borderWidth: proportionalSize(1),
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    searchResults: {
      height: 'auto',
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
      margin: 0,
      borderBottomColor: colors.border,
      justifyContent: 'center',
    },
    resultName: {
      fontSize: scaleFont(16),
      fontWeight: '500',
      color: colors.textPrimary,
    },
    resultAccessibility: {
      fontSize: scaleFont(14),
      color: colors.textSecondary,
    },
  });

  return (
    <View style={dynamicStyles.searchContainer}>
      <TextInput
        style={dynamicStyles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {showResults && searchResults.length > 0 && (
        <ScrollView
          style={dynamicStyles.searchResults}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {searchResults.map(item => (
            <TouchableOpacity
              key={item.id}
              style={dynamicStyles.resultItem}
              onPress={() => handleSelectLocation(item)}
            >
              <Text style={dynamicStyles.resultName}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default SearchBar;
