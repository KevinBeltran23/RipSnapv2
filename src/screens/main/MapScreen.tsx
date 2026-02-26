import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { INITIAL_REGION } from '../../config/constants';
import { useColors } from '../../hooks/useColors';
import {
  MapControls,
  LocationMarker,
  PinPlacementBanner,
  Legend,
} from '../../components/map';
import FilterSheet from '../../components/bottom-sheet/FilterSheet';
import { useMapScreen } from './useMapScreen';

const MapScreen = () => {
  const colors = useColors();
  const {
    mapRef,
    filteredLocations,
    isLoadingLocations,
    isPinPlacementMode,
    showLegend,
    tempPin,
    handleCurrentLocation,
    handleReload,
    toggleLegend,
    handleMapPress,
    selectLocation,
    cancelPin,
  } = useMapScreen();

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={handleMapPress}
      >
        {filteredLocations
          .filter(
            loc =>
              loc.coordinates &&
              !isNaN(loc.coordinates.latitude) &&
              !isNaN(loc.coordinates.longitude),
          )
          .map(loc => (
            <LocationMarker
              key={loc.id}
              location={loc}
              onPress={selectLocation}
            />
          ))}

        {tempPin && <Marker coordinate={tempPin} pinColor={colors.primary} />}
      </MapView>

      <MapControls
        onLocate={handleCurrentLocation}
        onReload={handleReload}
        onLegend={toggleLegend}
        isLoading={isLoadingLocations}
      />

      <Legend visible={showLegend} />

      {isPinPlacementMode && <PinPlacementBanner onCancel={cancelPin} />}

      <FilterSheet />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
});

export default MapScreen;
