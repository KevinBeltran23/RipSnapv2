import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type Orientation,
} from 'react-native-vision-camera';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import CaptureControls from '../../components/detection/CaptureControls';
import { getBestFormat } from '../../utils/camera';
import { isRemoteInferenceConfigured } from '../../config/remoteInference';
import { uploadCapturedImage } from '../../services/remoteInference/imageUpload';
import type { RemoteImageReceipt } from '../../services/remoteInference/imageUpload';

type UploadState = 'idle' | 'capturing' | 'uploading' | 'sent';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function RemoteCaptureScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>(
    'back',
  );
  const device = useCameraDevice(cameraPosition);
  const cameraRef = useRef<Camera>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [lastReceipt, setLastReceipt] = useState<RemoteImageReceipt | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const format = useMemo(
    () => (device != null ? getBestFormat(device, 720, 1280) : undefined),
    [device],
  );
  const isLandscape = width > height;
  const isProcessing =
    uploadState === 'capturing' || uploadState === 'uploading';
  const captureMode = isProcessing ? 'photo' : 'idle';
  const safeTop = insets.top;

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch(() => undefined);
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => undefined);
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => undefined);
    };
  }, []);

  const toggleCamera = useCallback(() => {
    if (isProcessing) return;
    setCameraPosition(previous => (previous === 'back' ? 'front' : 'back'));
  }, [isProcessing]);

  const handlePreviewOrientationChanged = useCallback(
    (_orientation: Orientation) => {
      // VisionCamera keeps the photo's orientation metadata. The server only
      // receives that metadata at this stage; no image processing is done.
    },
    [],
  );

  const handlePhoto = useCallback(async () => {
    if (isProcessing || !cameraRef.current) return;

    setError(null);
    setNotice(null);

    if (!isRemoteInferenceConfigured) {
      setError(
        'Set EXPO_PUBLIC_REMOTE_INFERENCE_URL to the server LAN address before sending a capture.',
      );
      return;
    }

    setUploadState('capturing');
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const captureId = `remote_${Date.now()}`;
      setUploadState('uploading');
      const receipt = await uploadCapturedImage(photo, captureId);
      setLastReceipt(receipt);
      setUploadState('sent');
    } catch (captureError) {
      setUploadState('idle');
      setError(
        captureError instanceof Error && captureError.message
          ? captureError.message
          : 'Could not send the image to the remote server.',
      );
    }
  }, [isProcessing]);

  const handleVideoUnavailable = useCallback(() => {
    setNotice('Server video streaming is the next checkpoint.');
  }, []);

  const statusLabel =
    uploadState === 'capturing'
      ? 'Capturing image'
      : uploadState === 'uploading'
        ? 'Sending image'
        : uploadState === 'sent'
          ? 'Image received'
          : isRemoteInferenceConfigured
            ? 'Server capture'
            : 'Server URL missing';
  const statusIcon =
    uploadState === 'sent'
      ? 'check-circle-outline'
      : error
        ? 'alert-circle-outline'
        : 'cloud-upload-outline';
  const infoMessage =
    error ??
    notice ??
    (!isRemoteInferenceConfigured
      ? 'Configure EXPO_PUBLIC_REMOTE_INFERENCE_URL with the server LAN address.'
      : lastReceipt
        ? `Received ${formatBytes(lastReceipt.sizeBytes)} · ${lastReceipt.sha256.slice(0, 8)}`
        : null);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          Camera access is needed for server capture.
        </Text>
        <Text style={styles.subtext}>
          Enable camera access in your device settings and try again.
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera unavailable</Text>
        <Text style={styles.subtext}>
          No usable camera was found on this device.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && uploadState !== 'uploading'}
        format={format}
        resizeMode="cover"
        outputOrientation="device"
        onPreviewOrientationChanged={handlePreviewOrientationChanged}
        photo={true}
        video={false}
        audio={false}
      />

      <View
        style={[
          styles.topBar,
          isLandscape && styles.topBarLandscape,
          { paddingTop: safeTop + 8 },
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.hudPill, isLandscape && styles.hudPillLandscape]}>
          <Icon name={statusIcon} size={16} color="#fff" />
          <Text style={styles.hudText}>{statusLabel}</Text>
        </View>

        <View style={styles.topControls}>
          <TouchableOpacity
            style={[styles.iconBtn, isProcessing && styles.disabledControl]}
            onPress={toggleCamera}
            disabled={isProcessing}
            accessibilityLabel="Switch camera"
            accessibilityRole="button"
          >
            <Icon name="camera-flip-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {infoMessage && (
        <View
          style={[
            styles.infoPill,
            { top: safeTop + 52 },
            error && styles.errorPill,
          ]}
        >
          <Text style={styles.infoText}>{infoMessage}</Text>
        </View>
      )}

      <CaptureControls
        captureMode={captureMode}
        isProcessing={isProcessing}
        recordingSeconds={0}
        videoEnabled={false}
        onPhoto={handlePhoto}
        onRecordStart={() => undefined}
        onRecordStop={() => undefined}
        onVideoUnavailable={handleVideoUnavailable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  subtext: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 320,
    textAlign: 'center',
    alignSelf: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBarLandscape: {
    justifyContent: 'center',
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  hudPillLandscape: {
    position: 'absolute',
    left: 16,
    bottom: 8,
  },
  hudText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledControl: {
    opacity: 0.45,
  },
  infoPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 10,
    maxWidth: 330,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  errorPill: {
    backgroundColor: 'rgba(120, 20, 20, 0.92)',
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});

export default RemoteCaptureScreen;
