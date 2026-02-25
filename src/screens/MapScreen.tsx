// src/screens/MapScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from 'react-native-maps';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as ExpoLocation from 'expo-location';
import ScrollUp from '../components/ScrollUp';
import Legend from '../components/Legend';
import { useLocationContext } from '../services/LocationContext';
import { useMapUI } from '../services/MapUIContext';
import { INITIAL_REGION } from '../constants';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

const MapScreen = () => {
  const {
    filteredLocations,
    selectedLocation,
    setSelectedLocation,
    setUserLocation,
    reloadAllLocations,
    isLoadingLocations,
    setNewPinnedLocation,
  } = useLocationContext();

  const {
    isAddingLocation,
    setIsAddingLocation,
    isPinPlacementMode,
    setIsPinPlacementMode,
    setShowDetailsPopup,
  } = useMapUI();

  const {
    scaleHeight,
    scaleWidth,
    scaleFont,
    proportionalSize,
    isMediumScreen,
    isLargeScreen,
  } = useResponsiveStyles();

  const [showLegend, setShowLegend] = useState(false);
  const colors = useColors();

  const mapRef = useRef<MapView>(null);

  useFocusEffect(
    useCallback(() => {
      reloadAllLocations();

      const requestAndFocusOnUser = async () => {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
          return;
        }
        try {
          const position = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.High,
          });
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude,
                longitude,
                latitudeDelta: proportionalSize(0.015),
                longitudeDelta: proportionalSize(0.015),
              },
              1000,
            );
          }
        } catch (error) {
          console.log('Error getting location on focus:', error);
          Alert.alert(
            'Location Error',
            'Unable to get your current location. Please check your device settings.',
          );
        }
      };

      requestAndFocusOnUser();
    }, [reloadAllLocations, setUserLocation, proportionalSize]),
  );

  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedLocation.coordinates.latitude,
          longitude: selectedLocation.coordinates.longitude,
          latitudeDelta: proportionalSize(0.01),
          longitudeDelta: proportionalSize(0.01),
        },
        1000,
      );
    }
  }, [selectedLocation, proportionalSize]);

  const handleCurrentLocation = async () => {
    if (mapRef.current) {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const position = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: proportionalSize(0.01),
            longitudeDelta: proportionalSize(0.01),
          },
          1000,
        );
      } catch (error) {
        console.log('Error getting location:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please check your device settings.',
          [{ text: 'OK' }],
        );
      }
    }
  };

  const toggleLegend = () => {
    setShowLegend(!showLegend);
  };

  const handleReload = useCallback(() => {
    console.log('Manual reload triggered');
    reloadAllLocations();
  }, [reloadAllLocations]);

  const handleMapPress = (event: any) => {
    if (isPinPlacementMode) {
      const { coordinate } = event.nativeEvent;
      setNewPinnedLocation(coordinate);
      setIsPinPlacementMode(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    callout: {
      padding: scaleWidth(8),
      minWidth: scaleWidth(120),
      backgroundColor: colors.background,
    },
    calloutTitle: {
      fontWeight: 'bold',
      fontSize: scaleFont(14),
      marginBottom: scaleHeight(4),
      color: colors.textPrimary,
    },
    calloutText: {
      fontSize: scaleFont(12),
      color: colors.textSecondary,
    },
    cancelButton: {
      position: 'absolute',
      top: scaleHeight(80),
      right: scaleWidth(100),
      backgroundColor: colors.error,
      padding: proportionalSize(10),
      borderRadius: proportionalSize(8),
      ...((isMediumScreen || isLargeScreen) && {
        top: scaleHeight(60),
        right: scaleWidth(70),
      }),
    },
    buttonText: {
      color: colors.textInverse,
      fontWeight: 'bold',
      fontSize: scaleFont(14),
    },
    currentLocationButton: {
      position: 'absolute',
      top: scaleHeight(80),
      right: scaleWidth(20),
      backgroundColor: colors.background,
      width: scaleFont(50),
      height: scaleFont(50),
      borderRadius: proportionalSize(25),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.25,
      shadowRadius: proportionalSize(3.84),
      elevation: 5,
      ...((isMediumScreen || isLargeScreen) && {
        top: scaleHeight(60),
      }),
    },
    legendButton: {
      position: 'absolute',
      top: scaleHeight(140),
      right: scaleWidth(20),
      backgroundColor: colors.background,
      width: scaleFont(50),
      height: scaleFont(50),
      borderRadius: proportionalSize(25),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.25,
      shadowRadius: proportionalSize(3.84),
      elevation: 5,
      ...((isMediumScreen || isLargeScreen) && {
        top: scaleHeight(120),
      }),
    },
    reloadButton: {
      position: 'absolute',
      top: scaleHeight(200),
      right: scaleWidth(20),
      backgroundColor: colors.background,
      width: scaleFont(50),
      height: scaleFont(50),
      borderRadius: proportionalSize(25),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.25,
      shadowRadius: proportionalSize(3.84),
      elevation: 5,
      ...((isMediumScreen || isLargeScreen) && {
        top: scaleHeight(180),
      }),
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={dynamicStyles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={handleMapPress}
      >
        {filteredLocations
          .filter(
            location =>
              location.coordinates &&
              !isNaN(location.coordinates.latitude) &&
              !isNaN(location.coordinates.longitude),
          )
          .map(location => (
            <Marker
              key={location.id}
              coordinate={location.coordinates}
              pinColor={colors[location.severityColor]}
              onPress={() => {
                setSelectedLocation(location);
                setShowDetailsPopup(true);
              }}
            >
              <Callout>
                <View style={dynamicStyles.callout}>
                  <Text style={dynamicStyles.calloutTitle}>
                    {location.name}
                  </Text>
                  <Text style={dynamicStyles.calloutText}>
                    {location.severity}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}

        {isAddingLocation &&
          selectedLocation &&
          selectedLocation.id.startsWith('temp-') && (
            <Marker
              coordinate={selectedLocation.coordinates}
              pinColor={colors.primary}
            />
          )}
      </MapView>

      <TouchableOpacity
        style={dynamicStyles.currentLocationButton}
        onPress={handleCurrentLocation}
      >
        <Icon
          name="crosshairs-gps"
          size={scaleFont(24)}
          color={colors.primary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={dynamicStyles.reloadButton}
        onPress={handleReload}
        disabled={isLoadingLocations}
      >
        <Icon
          name={isLoadingLocations ? 'loading' : 'refresh'}
          size={scaleFont(24)}
          color={isLoadingLocations ? colors.gray400 : colors.primary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={dynamicStyles.legendButton}
        onPress={toggleLegend}
      >
        <Icon name="help-circle" size={scaleFont(24)} color={colors.primary} />
      </TouchableOpacity>

      <Legend visible={showLegend} />

      {isPinPlacementMode && (
        <TouchableOpacity
          style={dynamicStyles.cancelButton}
          onPress={() => {
            setIsPinPlacementMode(false);
            setIsAddingLocation(false);
          }}
        >
          <Text style={dynamicStyles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      )}

      <ScrollUp />
    </View>
  );
};

export default MapScreen;
