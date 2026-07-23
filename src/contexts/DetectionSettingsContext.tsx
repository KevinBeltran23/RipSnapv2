import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createMMKV } from 'react-native-mmkv';
import {
  DETECTION_CONFIG,
  DETECTION_SETTING_LIMITS,
  RIP_CURRENT_MODEL,
  RIP_CURRENT_MODELS,
} from '../config/detection';

export interface DetectionSettings {
  confidenceThreshold: number;
  maxDetections: number;
  modelName: string;
}

interface DetectionSettingsContextValue {
  settings: DetectionSettings;
  updateSettings: (patch: Partial<DetectionSettings>) => void;
  resetSettings: () => void;
}

const storage = createMMKV({ id: 'detection-settings-cache' });

const STORAGE_KEYS = {
  confidenceThreshold: 'confidenceThreshold',
  maxDetections: 'maxDetections',
  modelName: 'modelName',
} as const;

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  confidenceThreshold: DETECTION_CONFIG.CONFIDENCE_THRESHOLD,
  maxDetections: DETECTION_CONFIG.MAX_DETECTIONS,
  modelName: RIP_CURRENT_MODEL.name,
};

const roundToStep = (value: number, step: number): number =>
  Math.round(value / step) * step;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const sanitizeSettings = (
  settings: Partial<DetectionSettings>,
): DetectionSettings => {
  const thresholdLimits = DETECTION_SETTING_LIMITS.CONFIDENCE_THRESHOLD;
  const maxDetectionsLimits = DETECTION_SETTING_LIMITS.MAX_DETECTIONS;
  const modelName =
    typeof settings.modelName === 'string' &&
    RIP_CURRENT_MODELS.some(model => model.name === settings.modelName)
      ? settings.modelName
      : DEFAULT_DETECTION_SETTINGS.modelName;

  return {
    confidenceThreshold: Number(
      clamp(
        roundToStep(
          settings.confidenceThreshold ??
            DEFAULT_DETECTION_SETTINGS.confidenceThreshold,
          thresholdLimits.STEP,
        ),
        thresholdLimits.MIN,
        thresholdLimits.MAX,
      ).toFixed(2),
    ),
    maxDetections: Math.round(
      clamp(
        settings.maxDetections ?? DEFAULT_DETECTION_SETTINGS.maxDetections,
        maxDetectionsLimits.MIN,
        maxDetectionsLimits.MAX,
      ),
    ),
    modelName,
  };
};

const readSettings = (): DetectionSettings =>
  sanitizeSettings({
    confidenceThreshold:
      storage.getNumber(STORAGE_KEYS.confidenceThreshold) ??
      DEFAULT_DETECTION_SETTINGS.confidenceThreshold,
    maxDetections:
      storage.getNumber(STORAGE_KEYS.maxDetections) ??
      DEFAULT_DETECTION_SETTINGS.maxDetections,
    modelName:
      storage.getString(STORAGE_KEYS.modelName) ??
      DEFAULT_DETECTION_SETTINGS.modelName,
  });

const writeSettings = (settings: DetectionSettings) => {
  storage.set(STORAGE_KEYS.confidenceThreshold, settings.confidenceThreshold);
  storage.set(STORAGE_KEYS.maxDetections, settings.maxDetections);
  storage.set(STORAGE_KEYS.modelName, settings.modelName);
};

const DetectionSettingsContext =
  createContext<DetectionSettingsContextValue | null>(null);

export function DetectionSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<DetectionSettings>(readSettings);

  const updateSettings = useCallback((patch: Partial<DetectionSettings>) => {
    setSettings(prev => {
      const next = sanitizeSettings({ ...prev, ...patch });
      writeSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const next = DEFAULT_DETECTION_SETTINGS;
    writeSettings(next);
    setSettings(next);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  );

  return (
    <DetectionSettingsContext.Provider value={value}>
      {children}
    </DetectionSettingsContext.Provider>
  );
}

export function useDetectionSettings() {
  const context = useContext(DetectionSettingsContext);
  if (!context) {
    throw new Error(
      'useDetectionSettings must be used within DetectionSettingsProvider',
    );
  }
  return context;
}
