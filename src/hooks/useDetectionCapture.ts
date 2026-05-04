/**
 * useDetectionCapture — photo/video capture with detection metadata.
 *
 * After capture completes, returns session data so the caller can
 * navigate to a review screen instead of showing an alert.
 */
import { useCallback, useRef, useState } from 'react';
import { Alert, Dimensions } from 'react-native';
import type { Camera } from 'react-native-vision-camera';
import type { Detection } from '../utils/detection';
import {
  generateSessionId,
  saveMediaFile,
  saveMetadataFile,
} from '../utils/capture';
import { YOLO_CONFIG } from '../config/yolo';

interface FrameRecord {
  timestamp: string;
  elapsedMs: number;
  frameIndex: number;
  detections: {
    class: number;
    className: string;
    confidence: number;
    bbox: [number, number, number, number];
  }[];
}

/** Data returned after a successful capture. */
export interface CaptureResult {
  sessionId: string;
  captureType: 'photo' | 'video';
  mediaUri: string;
  metadataUri: string;
  metadata: object;
}

interface UseCaptureReturn {
  captureMode: string;
  isProcessing: boolean;
  recordingSeconds: number;
  takePhoto: (currentDetections: Detection[]) => Promise<CaptureResult | null>;
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  logFrame: (detections: Detection[]) => void;
  /** Set externally when video recording finishes (via callback). */
  lastVideoResult: CaptureResult | null;
  clearLastVideoResult: () => void;
}

export function useDetectionCapture(
  cameraRef: React.RefObject<Camera | null>,
  cameraPosition: 'front' | 'back',
): UseCaptureReturn {
  const [captureMode, setCaptureMode] = useState('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [lastVideoResult, setLastVideoResult] = useState<CaptureResult | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);
  const frameIndexRef = useRef(0);
  const framesRef = useRef<FrameRecord[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Photo ─────────────────────────────────────────────────────────── */

  const takePhoto = useCallback(
    async (currentDetections: Detection[]): Promise<CaptureResult | null> => {
      const cam = cameraRef.current;
      if (!cam || captureMode === 'recording') return null;

      setCaptureMode('photo');
      setIsProcessing(true);

      try {
        const photo = await cam.takePhoto({ flash: 'off' });
        const sessionId = generateSessionId();
        const { width, height } = Dimensions.get('window');

        const mediaUri = await saveMediaFile(photo.path, sessionId, 'photo.jpg');

        const metadata = {
          sessionId,
          captureType: 'photo' as const,
          timestamp: new Date().toISOString(),
          modelName: 'best_yolov8n_float32',
          modelInputSize: YOLO_CONFIG.INPUT_SIZE,
          screenWidth: width,
          screenHeight: height,
          cameraPosition,
          frames: [
            {
              timestamp: new Date().toISOString(),
              elapsedMs: 0,
              frameIndex: 0,
              detections: currentDetections.map(d => ({
                class: d.class,
                className: d.className,
                confidence: d.confidence,
                bbox: d.bbox,
              })),
            },
          ],
        };

        const metadataUri = await saveMetadataFile(sessionId, metadata);

        return { sessionId, captureType: 'photo', mediaUri, metadataUri, metadata };
      } catch (e: any) {
        console.error('Photo capture failed:', e);
        Alert.alert('Capture Failed', e?.message ?? 'Could not take photo.');
        return null;
      } finally {
        setIsProcessing(false);
        setCaptureMode('idle');
      }
    },
    [cameraRef, cameraPosition, captureMode],
  );

  /* ── Video ─────────────────────────────────────────────────────────── */

  const startRecording = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam || captureMode !== 'idle') return;

    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;
    startTimeRef.current = Date.now();
    frameIndexRef.current = 0;
    framesRef.current = [];

    setCaptureMode('recording');
    setRecordingSeconds(0);
    setLastVideoResult(null);

    timerRef.current = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    cam.startRecording({
      flash: 'off',
      onRecordingFinished: async video => {
        setIsProcessing(true);
        try {
          const { width, height } = Dimensions.get('window');
          const mediaUri = await saveMediaFile(video.path, sessionId, 'video.mp4');

          const metadata = {
            sessionId,
            captureType: 'video' as const,
            startTime: new Date(startTimeRef.current).toISOString(),
            endTime: new Date().toISOString(),
            durationMs: Date.now() - startTimeRef.current,
            modelName: 'best_yolov8n_float32',
            modelInputSize: YOLO_CONFIG.INPUT_SIZE,
            screenWidth: width,
            screenHeight: height,
            cameraPosition,
            totalFrames: framesRef.current.length,
            frames: framesRef.current,
          };

          const metadataUri = await saveMetadataFile(sessionId, metadata);

          setLastVideoResult({
            sessionId,
            captureType: 'video',
            mediaUri,
            metadataUri,
            metadata,
          });
        } catch (e: any) {
          console.error('Video save failed:', e);
          Alert.alert('Save Failed', e?.message ?? 'Could not save video.');
        } finally {
          setIsProcessing(false);
          setCaptureMode('idle');
        }
      },
      onRecordingError: error => {
        console.error('Recording error:', error);
        setCaptureMode('idle');
        Alert.alert('Recording Error', error.message);
      },
    });
  }, [cameraRef, cameraPosition, captureMode]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const cam = cameraRef.current;
    if (cam && captureMode === 'recording') {
      await cam.stopRecording();
    }
  }, [cameraRef, captureMode]);

  /* ── Frame logging ─────────────────────────────────────────────────── */

  const logFrame = useCallback((detections: Detection[]) => {
    if (!sessionIdRef.current) return;
    const now = Date.now();
    framesRef.current.push({
      timestamp: new Date(now).toISOString(),
      elapsedMs: now - startTimeRef.current,
      frameIndex: frameIndexRef.current++,
      detections: detections.map(d => ({
        class: d.class,
        className: d.className,
        confidence: d.confidence,
        bbox: d.bbox,
      })),
    });
  }, []);

  const clearLastVideoResult = useCallback(() => {
    setLastVideoResult(null);
  }, []);

  return {
    captureMode,
    isProcessing,
    recordingSeconds,
    takePhoto,
    startRecording,
    stopRecording,
    logFrame,
    lastVideoResult,
    clearLastVideoResult,
  };
}
