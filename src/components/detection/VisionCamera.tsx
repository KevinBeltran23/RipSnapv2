import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type ReadonlyFrameProcessor,
  type DrawableFrameProcessor,
  type CameraDeviceFormat,
} from 'react-native-vision-camera';

type Props = {
  cameraPosition?: 'back' | 'front';
  isActive?: boolean;
  style?: StyleProp<ViewStyle>;
  frameProcessor?: ReadonlyFrameProcessor | DrawableFrameProcessor;
  format?: CameraDeviceFormat;
};

function VisionCamera({
  cameraPosition = 'back',
  isActive = true,
  style,
  frameProcessor,
  format,
}: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraPosition);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch(() => undefined);
    }
  }, [hasPermission, requestPermission]);

  if (!device || !hasPermission) {
    return <View style={[styles.fallback, style]} />;
  }

  return (
    <Camera
      style={[styles.camera, style]}
      device={device}
      isActive={isActive}
      photo={false}
      video={false}
      audio={false}
      frameProcessor={frameProcessor}
      format={format}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
});

export default VisionCamera;
