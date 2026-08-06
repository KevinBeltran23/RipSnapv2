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
import {
  completeVideoFrameStream,
  createVideoFrameStream,
  uploadVideoStreamFrame,
} from '../../services/remoteInference/frameStream';
import type { RemoteVideoStreamCompleteReceipt } from '../../services/remoteInference/frameStream';

const STREAM_TARGET_FPS = 2;

type UploadState =
  | 'idle'
  | 'capturing'
  | 'starting'
  | 'recording'
  | 'uploading'
  | 'sent';

type FrameStreamRuntime = {
  videoId: string;
  nextSequence: number;
  lastSequence: number | null;
  framesSent: number;
  framesDropped: number;
  inFlight: Promise<void> | null;
  stopped: boolean;
};

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
  const [lastStreamReceipt, setLastStreamReceipt] =
    useState<RemoteVideoStreamCompleteReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [streamFrameCount, setStreamFrameCount] = useState(0);
  const [streamDroppedCount, setStreamDroppedCount] = useState(0);
  const frameStreamRef = useRef<FrameStreamRuntime | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const format = useMemo(
    () => (device != null ? getBestFormat(device, 720, 1280) : undefined),
    [device],
  );
  const isLandscape = width > height;
  const isRecording = uploadState === 'recording';
  const isProcessing =
    uploadState === 'capturing' ||
    uploadState === 'starting' ||
    uploadState === 'uploading';
  const captureMode = isRecording
    ? 'recording'
    : isProcessing
      ? 'photo'
      : 'idle';
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

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  const finishFrameStream = useCallback(
    async (stream: FrameStreamRuntime, showSuccess: boolean) => {
      if (frameTimerRef.current) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      stream.stopped = true;

      try {
        if (stream.inFlight) {
          await stream.inFlight;
        }

        const startedAt = recordingStartedAtRef.current ?? Date.now();
        const receipt = await completeVideoFrameStream(stream.videoId, {
          ...(stream.lastSequence !== null
            ? { lastSequence: stream.lastSequence }
            : {}),
          framesSent: stream.framesSent,
          durationMs: Math.max(0, Date.now() - startedAt),
        });

        if (showSuccess) {
          setLastStreamReceipt(receipt);
          setUploadState('sent');
        }
      } catch (streamError) {
        if (showSuccess) {
          setUploadState('idle');
          setError(
            streamError instanceof Error && streamError.message
              ? streamError.message
              : 'Could not finish the remote video stream.',
          );
        }
      } finally {
        if (frameStreamRef.current === stream) {
          frameStreamRef.current = null;
        }
      }
    },
    [],
  );

  const captureAndSendFrame = useCallback(() => {
    const stream = frameStreamRef.current;
    const camera = cameraRef.current;
    if (!stream || stream.stopped || !camera) return;

    if (stream.inFlight) {
      stream.framesDropped += 1;
      setStreamDroppedCount(stream.framesDropped);
      return;
    }

    const sequence = stream.nextSequence;
    stream.nextSequence += 1;
    let framePromise: Promise<void>;
    framePromise = (async () => {
      try {
        const photo = await camera.takeSnapshot({ quality: 60 });
        const receipt = await uploadVideoStreamFrame(
          stream.videoId,
          photo,
          sequence,
          Date.now(),
        );
        stream.lastSequence = receipt.sequence;
        stream.framesSent += 1;
        setStreamFrameCount(stream.framesSent);
      } catch (frameError) {
        if (!stream.stopped) {
          setError(
            frameError instanceof Error && frameError.message
              ? frameError.message
              : 'Could not send a live video frame to the remote server.',
          );
        }
      } finally {
        stream.inFlight = null;
      }
    })();
    stream.inFlight = framePromise;
  }, []);

  useEffect(() => {
    if (!isRecording) return;

    const timer = setInterval(() => {
      captureAndSendFrame();
    }, 1000 / STREAM_TARGET_FPS);
    frameTimerRef.current = timer;
    captureAndSendFrame();

    return () => {
      clearInterval(timer);
      if (frameTimerRef.current === timer) {
        frameTimerRef.current = null;
      }
    };
  }, [captureAndSendFrame, isRecording]);

  const toggleCamera = useCallback(() => {
    if (isProcessing || isRecording) return;
    setCameraPosition(previous => (previous === 'back' ? 'front' : 'back'));
  }, [isProcessing, isRecording]);

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
    setLastReceipt(null);
    setLastStreamReceipt(null);

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

  const handleRecordStart = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera || isProcessing || isRecording) return;

    setError(null);
    if (!isRemoteInferenceConfigured) {
      setError(
        'Set EXPO_PUBLIC_REMOTE_INFERENCE_URL to the server LAN address before recording.',
      );
      return;
    }

    const captureId = `remote_video_${Date.now()}`;
    setLastReceipt(null);
    setLastStreamReceipt(null);
    setStreamFrameCount(0);
    setStreamDroppedCount(0);
    setUploadState('starting');

    (async () => {
      try {
        const stream = await createVideoFrameStream({
          captureId,
          sourceWidth: format?.videoWidth,
          sourceHeight: format?.videoHeight,
          orientation: isLandscape ? 'landscape' : 'portrait',
          mirrored: cameraPosition === 'front',
          targetFps: STREAM_TARGET_FPS,
        });
        const runtime: FrameStreamRuntime = {
          videoId: stream.videoId,
          nextSequence: 0,
          lastSequence: null,
          framesSent: 0,
          framesDropped: 0,
          inFlight: null,
          stopped: false,
        };
        frameStreamRef.current = runtime;
        recordingStartedAtRef.current = Date.now();

        camera.startRecording({
          fileType: 'mp4',
          flash: 'off',
          onRecordingFinished: () => {
            const activeStream = frameStreamRef.current;
            if (activeStream) {
              setUploadState('uploading');
              finishFrameStream(activeStream, true).catch(() => undefined);
            }
          },
          onRecordingError: recordingError => {
            const activeStream = frameStreamRef.current;
            if (activeStream) {
              finishFrameStream(activeStream, false).catch(() => undefined);
            }
            setUploadState('idle');
            setError(
              recordingError instanceof Error && recordingError.message
                ? recordingError.message
                : 'Could not record video.',
            );
          },
        });
        setUploadState('recording');
      } catch (recordingError) {
        const activeStream = frameStreamRef.current;
        if (activeStream) {
          finishFrameStream(activeStream, false).catch(() => undefined);
        }
        frameStreamRef.current = null;
        setUploadState('idle');
        setError(
          recordingError instanceof Error && recordingError.message
            ? recordingError.message
            : 'Could not start the remote video stream.',
        );
      }
    })().catch(() => undefined);
  }, [
    cameraPosition,
    finishFrameStream,
    format,
    isLandscape,
    isProcessing,
    isRecording,
  ]);

  const handleRecordStop = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      await cameraRef.current.stopRecording();
    } catch (recordingError) {
      const activeStream = frameStreamRef.current;
      if (activeStream) {
        finishFrameStream(activeStream, false).catch(() => undefined);
      }
      setUploadState('idle');
      setError(
        recordingError instanceof Error && recordingError.message
          ? recordingError.message
          : 'Could not finish recording.',
      );
    }
  }, [finishFrameStream, isRecording]);

  const statusLabel =
    uploadState === 'capturing'
      ? 'Capturing image'
      : uploadState === 'starting'
        ? 'Starting stream'
        : uploadState === 'recording'
          ? 'Streaming frames'
          : uploadState === 'uploading'
            ? 'Closing stream'
            : uploadState === 'sent'
              ? lastStreamReceipt
                ? 'Frames grouped'
                : 'Media received'
              : isRemoteInferenceConfigured
                ? 'Server capture'
                : 'Server URL missing';
  const statusIcon =
    uploadState === 'recording'
      ? 'record-circle-outline'
      : uploadState === 'sent'
        ? 'check-circle-outline'
        : error
          ? 'alert-circle-outline'
          : 'cloud-upload-outline';
  const infoMessage =
    error ??
    (!isRemoteInferenceConfigured
      ? 'Configure EXPO_PUBLIC_REMOTE_INFERENCE_URL with the server LAN address.'
      : uploadState === 'recording'
        ? `Sent ${streamFrameCount} frames${
            streamDroppedCount > 0 ? ` skipped: ${streamDroppedCount}` : ''
          }`
        : lastStreamReceipt
          ? `Grouped ${lastStreamReceipt.frameCount} frames${
              streamDroppedCount > 0 ? ` · ${streamDroppedCount} skipped` : ''
            }`
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
        video={true}
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
            style={[
              styles.iconBtn,
              (isProcessing || isRecording) && styles.disabledControl,
            ]}
            onPress={toggleCamera}
            disabled={isProcessing || isRecording}
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
        recordingSeconds={recordingSeconds}
        videoEnabled={true}
        onPhoto={handlePhoto}
        onRecordStart={handleRecordStart}
        onRecordStop={handleRecordStop}
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
