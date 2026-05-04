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

function LiveDetectionScreen() {
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>(
    'back',
  );
  const device = useCameraDevice(cameraPosition);
  const { resize } = useResizePlugin();

  const detectionsShared = useSharedValue<Detection[]>([]);
  const frameSkipCounter = useSharedValue(0);
  const processingFrame = useSharedValue(false);

  const [latestDetections, setLatestDetections] = useState<Detection[]>([]);

  // Track current orientation for resize rotation
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

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // Unlock orientation on mount, lock back to portrait on unmount
  useEffect(() => {
    ScreenOrientation.unlockAsync();

    const sub = ScreenOrientation.addOrientationChangeListener(event => {
      setOrientation(event.orientationInfo.orientation);
    });

    // Get initial orientation
    ScreenOrientation.getOrientationAsync().then(setOrientation);

    return () => {
      ScreenOrientation.removeOrientationChangeListener(sub);
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
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

  // useWindowDimensions updates reactively on orientation change
  const { width: viewWidth, height: viewHeight } = useWindowDimensions();

  // Determine the rotation to apply to the camera frame before feeding the model.
  // iOS camera sensor is landscape-right. We need to rotate the frame so the model
  // sees an upright image matching the current device orientation.
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

  const diagRef = useRef(0);
  const updateDetections = useCallback((newDetections: Detection[]) => {
    diagRef.current++;
    if (diagRef.current % 30 === 1) {
      if (newDetections.length > 0) {
        const d = newDetections[0];
        console.log(
          `[DET] count=${newDetections.length} top: ${d.className} conf=${d.confidence.toFixed(3)} bbox=[${d.bbox.map(v => v.toFixed(1)).join(',')}]`,
        );
      } else {
        console.log('[DET] count=0');
      }
    }
    setLatestDetections(newDetections);
  }, []);

  const updateDetectionsOnJS = useRunOnJS(updateDetections, [updateDetections]);

  const logErrorOnJS = useRunOnJS(
    (
      message: string,
      error: unknown,
      errorMessage?: string,
      errorStack?: string,
    ) => {
      console.error(message, error, errorMessage, errorStack);
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
          scale: {
            width: inputWidth,
            height: inputHeight,
          },
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

        // Get normalized 0-1 bboxes from the model
        const processedDetections = processYoloOutput(
          outputArray,
          1.0,
          1.0,
          inputWidth,
          yoloModel.model?.outputs[0]?.shape,
        );

        // Map normalized coords → screen coords
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
          // @ts-ignore
          error?.stack,
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
    setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'));
  }, []);

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
    <View style={styles.container} onTouchEnd={toggleCamera}>
      <StatusBar barStyle="light-content" />

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        frameProcessor={frameProcessor}
        fps={30}
        format={format}
        pixelFormat={pixelFormat}
        outputOrientation="device"
        photo={false}
        video={false}
        audio={false}
      />

      <Canvas style={StyleSheet.absoluteFill}>
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

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Tap to switch camera • YOLO Object Detection
        </Text>
      </View>
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
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default LiveDetectionScreen;
