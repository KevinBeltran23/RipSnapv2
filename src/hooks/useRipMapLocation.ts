import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useCurrentLocation } from './useCurrentLocation';
import type { RipCoordinate } from '../types/ripMap';

export function useRipMapLocation() {
  const { getCurrentPosition } = useCurrentLocation();

  const getUserCoordinate =
    useCallback(async (): Promise<RipCoordinate | null> => {
      const coordinate = await getCurrentPosition();
      if (!coordinate) {
        Alert.alert(
          'Location unavailable',
          'Allow location access to center the map on your position.',
        );
        return null;
      }
      return coordinate;
    }, [getCurrentPosition]);

  return { getUserCoordinate };
}
