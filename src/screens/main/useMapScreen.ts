/**
 * useMapScreen â€” all logic for MapScreen.
 * Extracts location permissions, animation, pin placement, and reload
 * so MapScreen.tsx is a pure render orchestrator.
 */
import { useRef, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import MapView from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useFilteredLocations } from '../../hooks/useFilteredLocations';
import { useQueryClient } from '@tanstack/react-query';
import { LOCATIONS_QUERY_KEY } from '../../services/store/locationQueries';
import { useMapUI } from '../../contexts/MapUIContext';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

export function useMapScreen() {
    const {
        selectedLocation,
        setSelectedLocation,
        setUserLocation,
        setNewPinnedLocation,
    } = useMapUI();

    const { filteredLocations, isLoading: isLoadingLocations } = useFilteredLocations();
    const queryClient = useQueryClient();

    const reloadAllLocations = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
    }, [queryClient]);

    const {
        isAddingLocation,
        setIsAddingLocation,
        isPinPlacementMode,
        setIsPinPlacementMode,
        setShowDetailsPopup,
    } = useMapUI();

    const { proportionalSize } = useResponsiveStyles();
    const mapRef = useRef<MapView>(null);
    const [showLegend, setShowLegend] = useState(false);

    const animateToCoords = useCallback(
        (latitude: number, longitude: number, delta = 0.01) => {
            mapRef.current?.animateToRegion(
                { latitude, longitude, latitudeDelta: proportionalSize(delta), longitudeDelta: proportionalSize(delta) },
                1000,
            );
        },
        [proportionalSize],
    );

    const requestAndFocusOnUser = useCallback(async () => {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') { console.log('Location permission denied'); return; }
        try {
            const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
            const { latitude, longitude } = pos.coords;
            setUserLocation({ latitude, longitude });
            animateToCoords(latitude, longitude, 0.015);
        } catch (error) {
            console.log('Error getting location on focus:', error);
            Alert.alert('Location Error', 'Unable to get your current location. Please check your device settings.');
        }
    }, [setUserLocation, animateToCoords]);

    useFocusEffect(
        useCallback(() => {
            reloadAllLocations();
            requestAndFocusOnUser();
        }, [reloadAllLocations, requestAndFocusOnUser]),
    );

    // Keep map centered on selected location
    const prevSelectedId = useRef<string | null>(null);
    if (selectedLocation && selectedLocation.id !== prevSelectedId.current) {
        prevSelectedId.current = selectedLocation.id;
        animateToCoords(selectedLocation.coordinates.latitude, selectedLocation.coordinates.longitude, 0.01);
    }

    const handleCurrentLocation = useCallback(async () => {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        try {
            const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
            const { latitude, longitude } = pos.coords;
            setUserLocation({ latitude, longitude });
            animateToCoords(latitude, longitude, 0.01);
        } catch (error) {
            Alert.alert('Location Error', 'Unable to get your current location. Please check your device settings.', [{ text: 'OK' }]);
        }
    }, [setUserLocation, animateToCoords]);

    const handleReload = useCallback(() => reloadAllLocations(), [reloadAllLocations]);

    const toggleLegend = useCallback(() => setShowLegend(prev => !prev), []);

    const handleMapPress = useCallback((event: any) => {
        if (isPinPlacementMode) {
            setNewPinnedLocation(event.nativeEvent.coordinate);
            setIsPinPlacementMode(false);
        }
    }, [isPinPlacementMode, setNewPinnedLocation, setIsPinPlacementMode]);

    const selectLocation = useCallback((location: any) => {
        setSelectedLocation(location);
        setShowDetailsPopup(true);
    }, [setSelectedLocation, setShowDetailsPopup]);

    const cancelPin = useCallback(() => {
        setIsPinPlacementMode(false);
        setIsAddingLocation(false);
    }, [setIsPinPlacementMode, setIsAddingLocation]);

    // The temp pin shown while adding a new location
    const tempPin = isAddingLocation && selectedLocation?.id.startsWith('temp-')
        ? selectedLocation.coordinates
        : null;

    return {
        mapRef,
        filteredLocations,
        selectedLocation,
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
    };
}
