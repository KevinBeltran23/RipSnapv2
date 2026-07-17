import * as ExpoLocation from 'expo-location';

export interface CaptureLocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  capturedAt: string;
  providerTimestamp: string;
  source: 'device_gps' | 'manual_map_pin';
}

const toLocationSnapshot = (
  position: ExpoLocation.LocationObject,
): CaptureLocationSnapshot => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  altitude: position.coords.altitude,
  altitudeAccuracy: position.coords.altitudeAccuracy,
  heading: position.coords.heading,
  speed: position.coords.speed,
  capturedAt: new Date().toISOString(),
  providerTimestamp: new Date(position.timestamp).toISOString(),
  source: 'device_gps',
});

export async function getCurrentLocationSnapshot(): Promise<CaptureLocationSnapshot | null> {
  const existingPermission = await ExpoLocation.getForegroundPermissionsAsync();
  let hasPermission = existingPermission.granted;

  if (!hasPermission) {
    const requestedPermission =
      await ExpoLocation.requestForegroundPermissionsAsync();
    hasPermission = requestedPermission.granted;
  }

  if (!hasPermission) {
    return null;
  }

  try {
    const position = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Highest,
    });
    return toLocationSnapshot(position);
  } catch (error) {
    console.error('Error getting current GPS location:', error);

    try {
      const fallbackPosition = await ExpoLocation.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
        requiredAccuracy: 100,
      });

      return fallbackPosition ? toLocationSnapshot(fallbackPosition) : null;
    } catch (fallbackError) {
      console.error('Error getting last known GPS location:', fallbackError);
      return null;
    }
  }
}
