import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  Canvas,
  Rect,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getBestFormat } from '../../utils/camera';
import { processYoloOutput, Detection } from '../../utils';
import { YOLO_CONFIG } from '../../config/yolo';
import { useRunOnJS } from 'react-native-worklets-core';
import { useDetectionCapture } from '../../hooks/useDetectionCapture';
import CaptureControls from '../../components/detection/CaptureControls';

function LiveDetectionScreen() {
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>(
    'back',
  );
  const device = useCameraDevice(cameraPosition);
  const { resize } = useResizePlugin();
  const cameraRef = useRef<Camera>(null);

  const detectionsShared = useSharedValue<Detection[]>([]);
  const frameSkipCounter = useSharedValue(0);
  const processingFrame = useSharedValue(false);

  const [latestDetections, setLatestDetections] = useState<Detection[]>([]);

  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>(
    ScreenOrientation.Orientation.PORTRAIT_UP,
  );

  const delegate = Platform.OS === 'ios' ? 'core-ml' : undefined;
  const yoloModel = useTensorflowModel(
    require('../../assets/models/best_yolov8n_float32.tflite'),
    delegate,
  );

  const format = useMemo(
    () => (device != null ? getBestFormat(device, 720, 1280) : undefined),
    [device],
  );

  const pixelFormat = Platform.OS === 'ios' ? 'rgb' : 'yuv';

  // Capture hook
  const {
    captureMode,
    isProcessing,
    recordingSeconds,
    takePhoto,
    startRecording,
    stopRecording,
    logFrame,
  } = useDetectionCapture(cameraRef, cameraPosition);

  const isRecording = captureMode === 'recording';

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    const sub = ScreenOrientation.addOrientationChangeListener(event => {
      setOrientation(event.orientationInfo.orientation);
    });
    ScreenOrientation.getOrientationAsync().then(setOrientation);
    return () => {
      ScreenOrientation.removeOrientationChangeListener(sub);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    const model = yoloModel.model;
    if (model == null) return;
    console.log('YOLO Model loaded successfully');
    console.log(`Input shape: ${model.inputs[0]?.shape}`);
    console.log(`Output shape: ${model.outputs[0]?.shape}`);
  }, [yoloModel]);

  const inputTensor = yoloModel.model?.inputs[0];
  const inputWidth = inputTensor?.shape[2] ?? YOLO_CONFIG.INPUT_SIZE;
  const inputHeight = inputTensor?.shape[1] ?? YOLO_CONFIG.INPUT_SIZE;

  const { width: viewWidth, height: viewHeight } = useWindowDimensions();

  const resizeRotation = useMemo((): '0deg' | '90deg' | '180deg' | '270deg' => {
    switch (orientation) {
      case ScreenOrientation.Orientation.PORTRAIT_UP:
        return '90deg';
      case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
        return '0deg';
      case ScreenOrientation.Orientation.PORTRAIT_DOWN:
        return '270deg';
      case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
        return '180deg';
      default:
        return '90deg';
    }
  }, [orientation]);

  // Detection callback — also logs frames during recording
  const updateDetections = useCallback(
    (newDetections: Detection[]) => {
      setLatestDetections(newDetections);

      // Log frame detections while recording video
      if (isRecording) {
        logFrame(newDetections);
      }
    },
    [isRecording, logFrame],
  );

  const updateDetectionsOnJS = useRunOnJS(updateDetections, [updateDetections]);

  const logErrorOnJS = useRunOnJS(
    (message: string, error: unknown, errorMessage?: string) => {
      console.error(message, error, errorMessage);
    },
    [],
  );

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      if (yoloModel.model == null) return;

      frameSkipCounter.value = (frameSkipCounter.value + 1) % 3;
      if (frameSkipCounter.value !== 0 || processingFrame.value) {
        return;
      }

      processingFrame.value = true;

      try {
        const resizedFrame = resize(frame, {
          scale: { width: inputWidth, height: inputHeight },
          pixelFormat: 'rgb',
          dataType: 'float32',
          rotation: resizeRotation,
        });

        const outputs = yoloModel.model.runSync([resizedFrame]);
        const output = outputs[0];
        const outputArray =
          output instanceof Float32Array
            ? output
            : new Float32Array(output.buffer || output);

        const processedDetections = processYoloOutput(
          outputArray,
          1.0,
          1.0,
          inputWidth,
          yoloModel.model?.outputs[0]?.shape,
        );

        const mirror = cameraPosition === 'front';
        const mapped: Detection[] = [];
        for (let i = 0; i < processedDetections.length; i++) {
          const d = processedDetections[i];
          let x = d.bbox[0] * viewWidth;
          const y = d.bbox[1] * viewHeight;
          const w = d.bbox[2] * viewWidth;
          const h = d.bbox[3] * viewHeight;

          if (mirror) {
            x = viewWidth - x - w;
          }

          mapped.push({
            ...d,
            bbox: [x, y, w, h] as [number, number, number, number],
          });
        }

        detectionsShared.value = mapped;
        updateDetectionsOnJS(mapped);
      } catch (error) {
        logErrorOnJS(
          'YOLO processing error:',
          error,
          // @ts-ignore
          error?.message,
        );
      } finally {
        processingFrame.value = false;
      }
    },
    [
      yoloModel,
      inputWidth,
      inputHeight,
      viewWidth,
      viewHeight,
      cameraPosition,
      resizeRotation,
      updateDetectionsOnJS,
      logErrorOnJS,
    ],
  );

  const font = useFont(
    require('../../assets/fonts/Roboto-VariableFont_wdth,wght.ttf'),
    14,
  );

  const boundingBoxes = useMemo(() => {
    if (!font) return [];
    return latestDetections.slice(0, 15).map((detection, index) => ({
      id: index,
      rect: {
        x: detection.bbox[0],
        y: detection.bbox[1],
        width: detection.bbox[2],
        height: detection.bbox[3],
      },
      label: `${detection.className} ${(detection.confidence * 100).toFixed(0)}%`,
      confidence: detection.confidence,
    }));
  }, [latestDetections, font]);

  const detectionCount = latestDetections.length;

  const toggleCamera = useCallback(() => {
    if (captureMode !== 'idle') return;
    setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'));
  }, [captureMode]);

  const handlePhoto = useCallback(() => {
    takePhoto(latestDetections);
  }, [takePhoto, latestDetections]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission required</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device found</Text>
      </View>
    );
  }

  if (!font) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading font...</Text>
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
        isActive={isFocused}
        frameProcessor={frameProcessor}
        fps={30}
        format={format}
        pixelFormat={pixelFormat}
        outputOrientation="device"
        photo={true}
        video={true}
        audio={false}
      />

      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {boundingBoxes.map(box => (
          <React.Fragment key={box.id}>
            <Rect
              rect={box.rect}
              style="stroke"
              strokeWidth={3}
              color="#FF00FF"
            />
            <Rect
              rect={{
                x: box.rect.x,
                y: Math.max(0, box.rect.y - 25),
                width: Math.min(
                  font.measureText(box.label).width + 8,
                  box.rect.width,
                ),
                height: 20,
              }}
              color="rgba(0, 0, 0, 0.8)"
            />
            <SkiaText
              text={box.label}
              x={box.rect.x + 4}
              y={Math.max(15, box.rect.y - 8)}
              color="white"
              font={font}
            />
          </React.Fragment>
        ))}

        <Rect
          rect={{ x: 10, y: 10, width: 150, height: 25 }}
          color="rgba(0, 0, 0, 0.7)"
        />
        <SkiaText
          text={`Objects: ${detectionCount}`}
          x={14}
          y={28}
          color="white"
          font={font}
        />
      </Canvas>

      {/* Camera switch — top right */}
      <View style={styles.switchWrap} pointerEvents="box-none">
        <Text
          style={styles.switchBtn}
          onPress={toggleCamera}
          accessibilityLabel="Switch camera"
          accessibilityRole="button"
        >
          ⟲
        </Text>
      </View>

      {/* Capture controls — bottom */}
      <CaptureControls
        captureMode={captureMode}
        isProcessing={isProcessing}
        recordingSeconds={recordingSeconds}
        onPhoto={handlePhoto}
        onRecordStart={startRecording}
        onRecordStop={stopRecording}
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
  switchWrap: {
    position: 'absolute',
    top: 60,
    right: 16,
  },
  switchBtn: {
    color: 'white',
    fontSize: 26,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    lineHeight: 42,
    textAlign: 'center',
    borderRadius: 22,
    overflow: 'hidden',
  },
});

export default LiveDetectionScreen;
