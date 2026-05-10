# RipSnap TFLite Models

These are the rip-current detection models used by the React Native app.

The live camera feed is configured in:

```text
src/config/detection.ts
```

This config points at the rip-current TFLite models in this folder.

## Current Model

The app is currently configured to use:

```text
efficientdet_lite0.tflite
```

The model is loaded from `src/config/detection.ts`:

```ts
export const RIP_CURRENT_MODEL = {
  name: 'efficientdet_lite0',
  displayName: 'EfficientDet Lite0 Rip Current',
  architecture: 'tflite_object_detection',
  asset: require('../../ripsnap_models/efficientdet_lite0.tflite'),
  inputSize: 320,
  labels: RIP_CURRENT_CLASSES,
} as const;
```

## Available Models

The TFLite models in this folder use `uint8` image input.

| Model                       | Input size | Input type |
| --------------------------- | ---------: | ---------- |
| `ssd_mobilenet_v1.tflite`   |    300x300 | `uint8`    |
| `efficientdet_lite0.tflite` |    320x320 | `uint8`    |
| `efficientdet_lite1.tflite` |    384x384 | `uint8`    |
| `efficientdet_lite2.tflite` |    448x448 | `uint8`    |

The live screen reads the loaded model's real input shape, so frame resizing
should follow whichever model is selected. The `inputSize` field in the config
is used for saved capture metadata and as a fallback.

## Output Parsing

These models use TensorFlow object-detection postprocess outputs, not a
single channels-first output tensor.

The parser in `src/utils/detection.ts` expects four outputs:

```text
boxes, classes, scores, count
```

The parser finds those tensors by shape and then maps detections into the
camera overlay format:

```ts
{
  bbox: [x, y, width, height],
  class: number,
  className: string,
  confidence: number
}
```

## Labels

The current React Native integration uses one label:

```text
rip_current
```

That came from the legacy Swift `RipSnap` label maps. The legacy repo also had
older label variants such as `sediment_rip` and `rip_current_T1`, but the
current TFLite files in this folder do not include label metadata. If a future
model is trained with multiple classes, update `RIP_CURRENT_CLASSES` in
`src/config/detection.ts` to match the model's class order exactly.

## Switching Models

To switch models, edit `RIP_CURRENT_MODEL` in `src/config/detection.ts`.

Example for `efficientdet_lite1.tflite`:

```ts
export const RIP_CURRENT_MODEL = {
  name: 'efficientdet_lite1',
  displayName: 'EfficientDet Lite1 Rip Current',
  architecture: 'tflite_object_detection',
  asset: require('../../ripsnap_models/efficientdet_lite1.tflite'),
  inputSize: 384,
  labels: RIP_CURRENT_CLASSES,
} as const;
```

Example for `efficientdet_lite2.tflite`:

```ts
export const RIP_CURRENT_MODEL = {
  name: 'efficientdet_lite2',
  displayName: 'EfficientDet Lite2 Rip Current',
  architecture: 'tflite_object_detection',
  asset: require('../../ripsnap_models/efficientdet_lite2.tflite'),
  inputSize: 448,
  labels: RIP_CURRENT_CLASSES,
} as const;
```

Example for `ssd_mobilenet_v1.tflite`:

```ts
export const RIP_CURRENT_MODEL = {
  name: 'ssd_mobilenet_v1',
  displayName: 'SSD MobileNet V1 Rip Current',
  architecture: 'tflite_object_detection',
  asset: require('../../ripsnap_models/ssd_mobilenet_v1.tflite'),
  inputSize: 300,
  labels: RIP_CURRENT_CLASSES,
} as const;
```

After switching, restart Metro so the new asset is bundled.
