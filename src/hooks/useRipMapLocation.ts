import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useCurrentLocation } from './useCurrentLocation';
import type { RipCoordinate } from '../types/ripMap';

export function useRipMapLocation() {
  const { getCurrentPosition } = useCurrentLocation();

  const getUserCoordinate =
    useCallback(async (): Promise<RipCoordinate | null> => {
      try {
        const coordinate = await getCurrentPosition();
        if (!coordinate) {
          Alert.alert(
            'Location Unavailable',
            'Allow location access to center the map on your position.',
          );
          return null;
        }
        return coordinate;
      } catch {
        Alert.alert(
          'Location Unavailable',
          'We could not determine your location. Please try again.',
        );
        return null;
      }
    }, [getCurrentPosition]);

  return { getUserCoordinate };
}
