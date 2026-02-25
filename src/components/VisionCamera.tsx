import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
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
  pixelFormat?: 'yuv' | 'rgb' | 'native'; // Added pixelFormat
  format?: CameraDeviceFormat; // Added format
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
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  if (!device || !hasPermission) {
    return <View style={[{ flex: 1, backgroundColor: 'black' }, style]} />;
  }

  return (
    <Camera
      style={[{ flex: 1 }, style]}
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

export default VisionCamera;
