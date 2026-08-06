/** Runtime configuration for the direct app-to-server capture path. */
const configuredBaseUrl = process.env.EXPO_PUBLIC_REMOTE_INFERENCE_URL?.trim();

export const REMOTE_INFERENCE_BASE_URL = (configuredBaseUrl ?? '').replace(
  /\/+$/,
  '',
);

export const isRemoteInferenceConfigured = REMOTE_INFERENCE_BASE_URL.length > 0;
