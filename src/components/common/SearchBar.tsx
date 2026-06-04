import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useDebounce } from '../../hooks/useDebounce';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import type { RipMapPoint } from '../../types/ripMap';

interface SearchBarProps {
  points?: RipMapPoint[];
  onSelectPoint?: (point: RipMapPoint) => void;
  placeholder?: string;
  initialValue?: string;
  showResults?: boolean;
  onTextChange?: (text: string) => void;
}

function SearchBar({
  points = [],
  onSelectPoint,
  placeholder = 'Search uploads...',
  initialValue = '',
  showResults = true,
  onTextChange,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const debouncedSearchTerm = useDebounce(searchQuery, 250);
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  useEffect(() => {
    setSearchQuery(initialValue);
  }, [initialValue]);

  const searchResults = useMemo(() => {
    const query = debouncedSearchTerm.trim().toLowerCase();
    if (!query) return [];

    return points
      .filter(point => {
        const searchable = [
          point.title,
          point.notes,
          point.captureType,
          point.coordinate.latitude.toFixed(6),
          point.coordinate.longitude.toFixed(6),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 8);
  }, [debouncedSearchTerm, points]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onTextChange?.(text);
  };

  const handleSelectPoint = (point: RipMapPoint) => {
    setSearchQuery(point.title);
    onSelectPoint?.(point);
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    results: {
      maxHeight: scaleHeight(210),
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: proportionalSize(8),
      position: 'absolute',
      top: scaleHeight(52),
      left: 0,
      right: 0,
      zIndex: 101,
      elevation: 4,
    },
    resultItem: {
      paddingVertical: scaleHeight(12),
      paddingHorizontal: proportionalSize(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    resultName: {
      fontSize: scaleFont(15),
      fontWeight: '600',
      color: colors.textPrimary,
    },
    resultMeta: {
      marginTop: scaleHeight(2),
      fontSize: scaleFont(12),
      color: colors.textSecondary,
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
          {searchResults.map(point => (
            <TouchableOpacity
              key={point.id}
              style={s.resultItem}
              onPress={() => handleSelectPoint(point)}
            >
              <Text style={s.resultName}>{point.title}</Text>
              <Text style={s.resultMeta}>
                {point.coordinate.latitude.toFixed(5)},{' '}
                {point.coordinate.longitude.toFixed(5)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default SearchBar;
