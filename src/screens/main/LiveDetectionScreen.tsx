import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { getBestFormat } from '../../utils/camera';
import { processObjectDetectionOutputs, Detection } from '../../utils';
import {
  DETECTION_CONFIG,
  RIP_CURRENT_MODEL,
  RIP_CURRENT_MODELS,
} from '../../config/detection';
import { useRunOnJS } from 'react-native-worklets-core';
import {
  useDetectionCapture,
  CaptureResult,
} from '../../hooks/useDetectionCapture';
import { useDetectionSettings } from '../../contexts/DetectionSettingsContext';
import CaptureControls from '../../components/detection/CaptureControls';
import CaptureReviewScreen from './CaptureReviewScreen';

function LiveDetectionScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
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
  const [reviewResult, setReviewResult] = useState<CaptureResult | null>(null);

  const [selectedModelName, setSelectedModelName] = useState<string>(
    RIP_CURRENT_MODEL.name,
  );
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const { settings: detectionSettings } = useDetectionSettings();

  const selectedModel = useMemo(
    () =>
      RIP_CURRENT_MODELS.find(model => model.name === selectedModelName) ??
      RIP_CURRENT_MODEL,
    [selectedModelName],
  );
  const ripCurrentModel = useTensorflowModel(selectedModel.asset);

  const format = useMemo(
    () => (device != null ? getBestFormat(device, 720, 1280) : undefined),
    [device],
  );

  const pixelFormat = Platform.OS === 'ios' ? 'rgb' : 'yuv';

  const {
    captureMode,
    isProcessing,
    recordingSeconds,
    takePhoto,
    startRecording,
    stopRecording,
    logFrame,
    lastVideoResult,
    clearLastVideoResult,
  } = useDetectionCapture(
    cameraRef,
    cameraPosition,
    selectedModel,
    detectionSettings,
  );

  const isRecording = captureMode === 'recording';

  useEffect(() => {
    if (lastVideoResult) {
      setReviewResult(lastVideoResult);
      clearLastVideoResult();
    }
  }, [lastVideoResult, clearLastVideoResult]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    };
  }, []);

  useEffect(() => {
    if (reviewResult) {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    } else {
      ScreenOrientation.unlockAsync();
    }
  }, [reviewResult]);

  useEffect(() => {
    const model = ripCurrentModel.model;
    if (model == null) return;
    console.log(`${selectedModel.displayName} loaded successfully`);
    console.log(`Input shape: ${model.inputs[0]?.shape}`);
    console.log(`Output shape: ${model.outputs[0]?.shape}`);
  }, [ripCurrentModel, selectedModel]);

  useEffect(() => {
    setLatestDetections([]);
    detectionsShared.value = [];
    frameSkipCounter.value = 0;
    processingFrame.value = false;
  }, [selectedModelName, detectionsShared, frameSkipCounter, processingFrame]);

  const inputTensor = ripCurrentModel.model?.inputs[0];
  const inputWidth =
    inputTensor?.shape[2] ?? DETECTION_CONFIG.DEFAULT_INPUT_SIZE;
  const inputHeight =
    inputTensor?.shape[1] ?? DETECTION_CONFIG.DEFAULT_INPUT_SIZE;
  const inputDataType = inputTensor?.dataType === 'uint8' ? 'uint8' : 'float32';
  const firstOutputShape = ripCurrentModel.model?.outputs[0]?.shape ?? null;

  const { width: viewWidth, height: viewHeight } = useWindowDimensions();
  const isLandscape = viewWidth > viewHeight;

  const updateDetections = useCallback(
    (newDetections: Detection[]) => {
      setLatestDetections(newDetections);
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

      if (ripCurrentModel.model == null) return;

      frameSkipCounter.value = (frameSkipCounter.value + 1) % 3;
      if (frameSkipCounter.value !== 0 || processingFrame.value) {
        return;
      }

      processingFrame.value = true;

      try {
        let resizeRotation: '0deg' | '90deg' | '180deg' | '270deg' = '0deg';
        switch (frame.orientation) {
          case 'portrait':
            resizeRotation = '0deg';
            break;
          case 'landscape-left':
            resizeRotation = '270deg';
            break;
          case 'portrait-upside-down':
            resizeRotation = '180deg';
            break;
          case 'landscape-right':
            resizeRotation = '90deg';
            break;
        }

        const resizedFrame = resize(frame, {
          scale: { width: inputWidth, height: inputHeight },
          pixelFormat: 'rgb',
          dataType: inputDataType,
          rotation: resizeRotation,
        });

        const outputs = ripCurrentModel.model.runSync([resizedFrame]);
        const processedDetections = processObjectDetectionOutputs(
          outputs as Parameters<typeof processObjectDetectionOutputs>[0],
          1.0,
          1.0,
          inputWidth,
          inputHeight,
          detectionSettings.confidenceThreshold,
          detectionSettings.maxDetections,
          firstOutputShape,
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
          'Rip-current detection processing error:',
          error,
          // @ts-ignore
          error?.message,
        );
      } finally {
        processingFrame.value = false;
      }
    },
    [
      ripCurrentModel,
      inputWidth,
      inputHeight,
      inputDataType,
      firstOutputShape,
      viewWidth,
      viewHeight,
      cameraPosition,
      detectionSettings.confidenceThreshold,
      detectionSettings.maxDetections,
      updateDetectionsOnJS,
      logErrorOnJS,
    ],
  );

  const font = useFont(
    require('../../assets/fonts/Roboto-VariableFont_wdth,wght.ttf'),
    14,
  );

  // Offset bounding boxes and HUD below the safe area (notch/dynamic island)
  const safeTop = insets.top;

  const boundingBoxes = useMemo(() => {
    if (!font) return [];
    return latestDetections.map((detection, index) => ({
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

  const toggleModelMenu = useCallback(() => {
    if (captureMode !== 'idle') return;
    setIsModelMenuOpen(prev => !prev);
  }, [captureMode]);

  const selectModel = useCallback(
    (modelName: string) => {
      if (captureMode !== 'idle') return;
      setSelectedModelName(modelName);
      setIsModelMenuOpen(false);
    },
    [captureMode],
  );

  const handlePhoto = useCallback(async () => {
    const result = await takePhoto(latestDetections);
    if (result) {
      setReviewResult(result);
    }
  }, [takePhoto, latestDetections]);

  const handleBackFromReview = useCallback(() => {
    setReviewResult(null);
  }, []);

  const handleRecapture = useCallback(() => {
    setReviewResult(null);
  }, []);

  if (reviewResult) {
    return (
      <CaptureReviewScreen
        captureResult={reviewResult}
        onBack={handleBackFromReview}
        onRecapture={handleRecapture}
      />
    );
  }

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
        isActive={isFocused && !reviewResult}
        frameProcessor={frameProcessor}
        fps={30}
        format={format}
        pixelFormat={pixelFormat}
        outputOrientation="device"
        photo={true}
        video={true}
        audio={false}
      />

      {/* Detection overlay */}
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
      </Canvas>

      {/* Top HUD — positioned below the notch/dynamic island */}
      <View
        style={[
          styles.topBar,
          isLandscape && styles.topBarLandscape,
          { paddingTop: safeTop + 8 },
        ]}
        pointerEvents="box-none"
      >
        {/* Detection count pill */}
        <View style={[styles.hudPill, isLandscape && styles.hudPillLandscape]}>
          <Icon name="eye-outline" size={16} color="#fff" />
          <Text style={styles.hudText}>
            {detectionCount} detection{detectionCount !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.topControls}>
          {/* Model selector */}
          <TouchableOpacity
            style={[
              styles.modelBtn,
              captureMode !== 'idle' && styles.disabledControl,
            ]}
            onPress={toggleModelMenu}
            disabled={captureMode !== 'idle'}
            accessibilityLabel="Select detection model"
            accessibilityRole="button"
          >
            <Icon name="chip" size={16} color="#fff" />
            <Text style={styles.modelBtnText}>{selectedModel.shortName}</Text>
            <Icon
              name={isModelMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Camera switch button */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              captureMode !== 'idle' && styles.disabledControl,
            ]}
            onPress={toggleCamera}
            disabled={captureMode !== 'idle'}
            accessibilityLabel="Switch camera"
            accessibilityRole="button"
          >
            <Icon name="camera-flip-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {isModelMenuOpen && captureMode === 'idle' && (
        <View
          style={[
            styles.modelMenu,
            isLandscape ? styles.modelMenuLandscape : styles.modelMenuPortrait,
            { top: safeTop + 52 },
          ]}
        >
          {RIP_CURRENT_MODELS.map(model => {
            const selected = model.name === selectedModel.name;
            return (
              <TouchableOpacity
                key={model.name}
                style={[
                  styles.modelOption,
                  selected && styles.modelOptionSelected,
                ]}
                onPress={() => selectModel(model.name)}
                accessibilityLabel={`Use ${model.displayName}`}
                accessibilityRole="button"
              >
                <View>
                  <Text style={styles.modelOptionTitle}>{model.shortName}</Text>
                  <Text style={styles.modelOptionSubtitle}>
                    {model.inputSize}x{model.inputSize}
                  </Text>
                </View>
                {selected && <Icon name="check" size={18} color="#fff" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Model loading indicator */}
      {ripCurrentModel.model == null && (
        <View style={[styles.loadingPill, { top: safeTop + 52 }]}>
          <Text style={styles.loadingText}>Loading model...</Text>
        </View>
      )}

      {/* Capture controls */}
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    borderRadius: 18,
  },
  modelBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledControl: {
    opacity: 0.45,
  },
  modelMenu: {
    position: 'absolute',
    width: 190,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modelMenuPortrait: {
    right: 60,
  },
  modelMenuLandscape: {
    left: '50%',
    transform: [{ translateX: -95 }],
  },
  modelOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modelOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  modelOptionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modelOptionSubtitle: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    marginTop: 2,
  },
  loadingPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default LiveDetectionScreen;
