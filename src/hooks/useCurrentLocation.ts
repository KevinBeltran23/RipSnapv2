/**
 * useCurrentLocation — shared location permission + current-position hook.
 * Used by screens that need device GPS.
 */
import { useCallback } from 'react';
import * as ExpoLocation from 'expo-location';

interface Coordinate {
  latitude: number;
  longitude: number;
}

export function useCurrentLocation() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
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
      } catch {
        return null;
      }
    }, [requestPermission]);

  return { requestPermission, getCurrentPosition };
}
