/**
 * useLocationPermission — requests camera + location permission for LiveDetectionScreen.
 */
import { useEffect } from 'react';
import { useCameraPermission } from 'react-native-vision-camera';

export function useLocationPermission() {
    const { hasPermission, requestPermission } = useCameraPermission();

    useEffect(() => {
        if (!hasPermission) requestPermission();
    }, [hasPermission, requestPermission]);

    return { hasCameraPermission: hasPermission };
}
