/**
 * useCurrentLocation — shared location permission + current-position hook.
 * Used by MapScreen (via useMapScreen) and any other screen needing device GPS.
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ExpoLocation from 'expo-location';

interface Coordinate {
  latitude: number;
  longitude: number;
}

export function useCurrentLocation() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  }, []);

  const getCurrentPosition =
    useCallback(async (): Promise<Coordinate | null> => {
      const granted = await requestPermission();
      if (!granted) return null;
      try {
        const pos = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please check device settings.',
        );
        return null;
      }
    }, [requestPermission]);

  return { requestPermission, getCurrentPosition };
}
