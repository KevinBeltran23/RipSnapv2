import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  //  Dimensions,
  StatusBar,
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
import { getBestFormat } from '../formatFilter';
import { processYoloOutput, Detection } from '../utils';
import { YOLO_CONFIG } from '../constants';
import { useRunOnJS } from 'react-native-worklets-core';

// const VIEW_WIDTH = Dimensions.get('screen').width;

function LiveDetectionScreen() {
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>(
    'back',
  );
  const device = useCameraDevice(cameraPosition);
  const { resize } = useResizePlugin();

  // Use shared values for performance
  const detectionsShared = useSharedValue<Detection[]>([]);
  const frameSkipCounter = useSharedValue(0);
  const processingFrame = useSharedValue(false);

  // Keep React state for triggering re-renders
  const [latestDetections, setLatestDetections] = useState<Detection[]>([]);

  const delegate = Platform.OS === 'ios' ? 'core-ml' : undefined;
  const yoloModel = useTensorflowModel(
    require('../assets/models/best_yolov8n_float32.tflite'),
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

  useEffect(() => {
    const model = yoloModel.model;
    if (model == null) return;

    console.log('YOLO Model loaded successfully');
    console.log(`Input shape: ${model.inputs[0]?.shape}`);
    console.log(`Output shape: ${model.outputs[0]?.shape}`);
  }, [yoloModel]);

  const inputTensor = yoloModel.model?.inputs[0];
  const inputWidth = inputTensor?.shape[1] ?? YOLO_CONFIG.INPUT_SIZE;
  const inputHeight = inputTensor?.shape[2] ?? YOLO_CONFIG.INPUT_SIZE;

  const rotation = '0deg';

  // Memoize static values for performance
  const scaleFactors = useMemo(
    () => ({
      inputWidth,
      inputHeight,
      rotation,
    }),
    [inputWidth, inputHeight],
  );

  const updateDetections = useCallback((newDetections: Detection[]) => {
    console.log('Update Detections (iOS):', newDetections.length);
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

      // Frame skipping for performance - process every 3rd frame
      frameSkipCounter.value = (frameSkipCounter.value + 1) % 3;
      if (frameSkipCounter.value !== 0 || processingFrame.value) {
        return;
      }

      processingFrame.value = true;

      try {
        const resizedFrame = resize(frame, {
          scale: {
            width: scaleFactors.inputWidth,
            height: scaleFactors.inputHeight,
          },
          pixelFormat: 'rgb',
          dataType: 'float32',
          rotation: rotation as '0deg' | '90deg' | '180deg' | '270deg',
        });

        const outputs = yoloModel.model.runSync([resizedFrame]);
        const output = outputs[0];

        const outputArray =
          output instanceof Float32Array
            ? output
            : new Float32Array(output.buffer || output);

        const processedDetections = processYoloOutput(
          outputArray,
          scaleFactors.inputWidth,
          scaleFactors.inputHeight,
          scaleFactors.inputWidth,
          yoloModel.model?.outputs[0]?.shape,
        );

        const scaleX = frame.width / scaleFactors.inputWidth;
        const scaleY = frame.height / scaleFactors.inputHeight;
        const mirror = cameraPosition === 'front';

        // Optimized coordinate transformation
        const mapped: Detection[] = [];
        for (let i = 0; i < processedDetections.length; i++) {
          const d = processedDetections[i];
          let x = d.bbox[0] * scaleX;
          const y = d.bbox[1] * scaleY;
          const w = d.bbox[2] * scaleX;
          const h = d.bbox[3] * scaleY;

          if (mirror) {
            x = frame.width - (x + w);
          }

          mapped.push({
            ...d,
            bbox: [x, y, w, h] as [number, number, number, number],
          });
        }

        // Update shared value for worklet thread performance
        detectionsShared.value = mapped;

        // Update React state for UI re-renders (throttled by frame skipping)
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
      scaleFactors,
      cameraPosition,
      updateDetectionsOnJS,
      logErrorOnJS,
    ],
  );

  const font = useFont(
    require('../assets/fonts/Roboto-VariableFont_wdth,wght.ttf'),
    14,
  );

  // Fallback React state for UI rendering (when shared values don't trigger re-renders)
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
        fps={30} // Higher FPS since we're skipping frames
        format={format}
        pixelFormat={pixelFormat}
        photo={false}
        video={false}
        audio={false}
      />

      <Canvas style={StyleSheet.absoluteFill}>
        {/* Use React state for reliable rendering */}
        {boundingBoxes.map(box => (
          <React.Fragment key={box.id}>
            <Rect
              rect={box.rect}
              style="stroke"
              strokeWidth={3} // Reduced for performance
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
