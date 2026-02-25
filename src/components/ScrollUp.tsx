import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useLocationContext } from '../services/LocationContext';
import { useMapUI } from '../services/MapUIContext';
import { LocationData } from '../types/location';
import PopupSheet from './PopupSheet';
import SearchBar from './SearchBar';
import {
  BOTTOM_SHEET_SNAP_POINTS,
  CATEGORY_OPTIONS,
  SEVERITY_OPTIONS,
} from '../constants';
import { Colors, useColors } from '../hooks/useColors';
import DropdownSelector from './DropdownSelector';
import { SeverityLevel } from '../types/severity';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

function ScrollUp() {
  const {
    selectedLocation,
    setSelectedLocation,
    clearLocationStates,
    filteredLocations,
  } = useLocationContext();

  const {
    showDetailsPopup,
    setShowDetailsPopup,
    showAddDataPopup,
    setShowAddDataPopup,
    categoryFilter,
    setCategoryFilter,
    severityFilter,
    setSeverityFilter,
  } = useMapUI();

  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  useEffect(() => {
    const isAnyPopupOpen = showDetailsPopup || showAddDataPopup;
    if (!isAnyPopupOpen) {
      clearLocationStates();
    }
  }, [showDetailsPopup, showAddDataPopup, clearLocationStates]);

  const [activeSnapIndex, setActiveSnapIndex] = useState(0);

  const handleShowLocation = (location: LocationData) => {
    setSelectedLocation(location);
    setShowDetailsPopup(true);
  };

  const handleClosePopup = () => {
    setShowDetailsPopup(false);
  };

  const handleShowAddData = () => {
    setShowAddDataPopup(true);
  };

  const handleCloseAddData = () => {
    setShowAddDataPopup(false);
  };

  const handleCategorySelect = (value: string | number | null) => {
    setCategoryFilter(value as number);
  };

  const handleSeveritySelect = (value: string | number | null) => {
    setSeverityFilter(value as SeverityLevel | null);
  };

  const getSuggestedLocations = () => {
    return filteredLocations.slice(0, 6);
  };

  const dynamicStyles = StyleSheet.create({
    bottomSheet: {
      zIndex: 100,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: proportionalSize(16),
    },
    sectionTitle: {
      color: colors.textPrimary,
      marginBottom: scaleHeight(8),
      fontSize: scaleFont(16),
      fontWeight: '500',
      marginTop: scaleHeight(8),
    },
    suggestedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    suggestedItem: {
      width: scaleWidth(150),
      height: scaleHeight(50),
      borderRadius: proportionalSize(8),
      marginBottom: scaleHeight(12),
      justifyContent: 'center',
      alignItems: 'center',
      padding: proportionalSize(8),
    },
    suggestedText: {
      color: colors.textInverse,
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: scaleFont(14),
    },
    addDataButton: {
      backgroundColor: colors.secondary,
      paddingVertical: scaleHeight(10),
      paddingHorizontal: scaleWidth(15),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: scaleWidth(90),
      flexGrow: 1,
      marginHorizontal: scaleWidth(4),
      marginTop: scaleHeight(16),
      marginBottom: scaleHeight(16),
    },
    addDataButtonText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
  });

  const selectedSeverityOption = SEVERITY_OPTIONS.find(
    option => option.level === severityFilter,
  );
  const severityButtonBackgroundColor = selectedSeverityOption
    ? colors[selectedSeverityOption.color]
    : colors.info;

  if (showAddDataPopup) {
    return (
      <PopupSheet
        mode="add"
        location={selectedLocation || undefined}
        onClose={handleCloseAddData}
        index={activeSnapIndex}
        onChange={setActiveSnapIndex}
        initialCategory={categoryFilter}
      />
    );
  }

  if (showDetailsPopup && selectedLocation) {
    return (
      <PopupSheet
        mode="view"
        location={selectedLocation}
        onClose={handleClosePopup}
        index={activeSnapIndex}
        onChange={setActiveSnapIndex}
      />
    );
  }

  return (
    <BottomSheet
      index={activeSnapIndex}
      snapPoints={BOTTOM_SHEET_SNAP_POINTS}
      onChange={setActiveSnapIndex}
      backgroundStyle={{
        backgroundColor: colors.background,
        borderTopLeftRadius: proportionalSize(24),
        borderTopRightRadius: proportionalSize(24),
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.gray300,
        width: scaleWidth(40),
      }}
      enablePanDownToClose={false}
      style={dynamicStyles.bottomSheet}
    >
      <BottomSheetScrollView
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.contentContainer}
      >
        <SearchBar onSelectLocation={handleShowLocation} />

        <TouchableOpacity
          style={dynamicStyles.addDataButton}
          onPress={handleShowAddData}
        >
          <Text style={dynamicStyles.addDataButtonText}>Add Data</Text>
        </TouchableOpacity>

        <DropdownSelector
          title="Filter by Category"
          options={CATEGORY_OPTIONS.map(cat => ({
            label: cat.label,
            value: cat.id,
            icon: cat.icon,
          }))}
          selectedValue={categoryFilter}
          onValueChange={handleCategorySelect}
          placeholder="Select a category..."
          buttonBackgroundColor={colors.primary}
          buttonTextColor={colors.textInverse}
        />

        <DropdownSelector
          title="Filter by Severity"
          options={[
            {
              label: 'All Severities',
              value: null,
              icon: 'filter-remove',
              colorKey: 'info' as keyof Colors,
            },
            ...SEVERITY_OPTIONS.map(sev => ({
              label: sev.label,
              value: sev.level,
              icon: undefined,
              colorKey: sev.color as keyof Colors,
            })),
          ]}
          selectedValue={severityFilter}
          onValueChange={handleSeveritySelect}
          placeholder="Select a severity..."
          buttonBackgroundColor={severityButtonBackgroundColor}
          buttonTextColor={colors.textInverse}
        />

        <Text style={dynamicStyles.sectionTitle}>Suggested</Text>
        <View style={dynamicStyles.suggestedGrid}>
          {getSuggestedLocations().map(location => (
            <TouchableOpacity
              key={location.id}
              style={[
                dynamicStyles.suggestedItem,
                { backgroundColor: colors[location.severityColor] },
              ]}
              onPress={() => handleShowLocation(location)}
            >
              <Text style={dynamicStyles.suggestedText} numberOfLines={1}>
                {location.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

export default ScrollUp;
