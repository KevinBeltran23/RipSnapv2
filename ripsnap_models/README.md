# RipSnap TFLite Models

These are the rip-current detection models used by the React Native live feed.

The live camera feed is configured in:

```text
src/config/detection.ts
```

This config points at the rip-current TFLite models in this folder.

## In-App Model Selection

The live feed has an in-app model selector in the top HUD. Tap the model pill to
switch between the bundled models without editing code.

Switching is disabled while recording so one video capture does not mix
detections from multiple models. When the selected model changes, the app reloads
the TFLite model and clears any stale boxes from the previous model.

The default model is:

```text
efficientdet_lite0.tflite
```

The selectable models are registered in `src/config/detection.ts`:

```ts
export const RIP_CURRENT_MODELS = [
  // efficientdet_lite0, efficientdet_lite1,
  // efficientdet_lite2, and ssd_mobilenet_v1
];
```

Each entry has:

```ts
{
  name: string,        // saved in capture metadata
  displayName: string, // used for logs/accessibility labels
  shortName: string,   // shown in the top-HUD selector pill
  asset: number,       // require(...) result for the .tflite asset
  inputSize: number,   // saved in capture metadata
  labels: string[],
}
```

## Available Models

The TFLite models in this folder use `uint8` image input.

| Model                       | Input size | Input type |
| --------------------------- | ---------: | ---------- |
| `ssd_mobilenet_v1.tflite`   |    300x300 | `uint8`    |
| `efficientdet_lite0.tflite` |    320x320 | `uint8`    |
| `efficientdet_lite1.tflite` |    384x384 | `uint8`    |
| `efficientdet_lite2.tflite` |    448x448 | `uint8`    |

The live screen reads the loaded model's real input shape and input data type, so
frame resizing follows whichever model is selected. The `inputSize` field in the
config is used for saved capture metadata and as a fallback.

## Capture Metadata

Photo and video captures save the active model information:

```json
{
  "modelName": "efficientdet_lite0",
  "modelInputSize": 320
}
```

This metadata is passed from the live feed into `useDetectionCapture`, so it
tracks the model selected at capture time.

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

## Changing the Default Model

To change the startup default, reorder `RIP_CURRENT_MODELS` in
`src/config/detection.ts` or update the exported `RIP_CURRENT_MODEL`.

The app already includes selectable entries for all bundled TFLite models.

```ts
export const RIP_CURRENT_MODEL = RIP_CURRENT_MODELS[0];
```

Changing the index changes the initial model shown when the live feed opens.

Restart Metro after adding a new model file so the asset is bundled.
