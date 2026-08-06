# RipSnapv2

RipSnapv2 is a React Native app for rip-current detection and capture upload.
The current app supports local on-device TFLite inference. A planned remote
streaming mode would allow heavier PyTorch `.pt` models to run on a server while
users interact with a live camera/detection experience from inside the mobile
app.

## Current Direct Server Checkpoint

The app now has a separate **Server** camera tab beside the existing local
camera tab. It reuses the native camera preview, camera switch, orientation,
and capture controls. A photo is sent directly to
`ripsnap-remote-inference` at `POST /v1/images`. Video recording now opens one
server stream at `POST /v1/video-streams`, sends JPEG snapshots sequentially at
2 FPS while recording, and closes it with `/complete`.

The server groups those frames under one `videoId` and writes an ordered
manifest. This checkpoint does not mux the frames into an MP4 or process them
yet. The older short-MP4 path at `POST /v1/videos` remains available for
transport testing.

Set `EXPO_PUBLIC_REMOTE_INFERENCE_URL` to the server's LAN address, such as
`http://192.168.1.100:8000`, before building the development client. The phone
and server must be on the same network. HTTP cleartext allowances are enabled
only when this development URL uses `http://`; use HTTPS before production.

## Current Local Detection Path

```text
Phone camera -> local TFLite model -> native overlay -> native capture review -> Firebase upload
```

Local models live in:

```text
ripsnap_models/
```

The app model registry lives in:

```text
src/config/detection.ts
```

## Remote Streaming Goal

Add an optional remote detection mode where users can stream camera frames or
video from the native Server tab to a server running heavier `.pt` models,
receive detections in real time, and upload captures through the existing mobile
app flow.

```text
RipSnap native Server tab -> phone camera -> LiveKit/WebRTC -> server .pt model -> native overlay
```

This remote mode would exist alongside the current local TFLite mode.

### Planned Streaming Architecture

```text
RipSnap React Native Server tab
  native camera preview and capture controls
  LiveKit client publishes camera video
  native overlay draws server detections

LiveKit
  handles WebRTC rooms, signaling, reconnects, and video transport
  carries camera video from the phone to the inference worker
  carries detection messages back to the web app

Python inference worker
  joins the LiveKit room
  reads video frames
  runs PyTorch .pt model
  returns normalized detection boxes
```

LiveKit is the preferred starting point because it gives us WebRTC without
having to build raw signaling, room management, reconnect handling, and
STUN/TURN plumbing ourselves.

If LiveKit ends up being too limiting for the research workflow, the later
alternative would be a custom WebRTC stack. That should only be considered after
we have benchmarked the LiveKit version and know what problem we are trying to
solve.

### Future Remote Client Stack

```text
React
React Native
VisionCamera
Native overlay
LiveKit JavaScript client
```

### Backend Stack

```text
Python
LiveKit server / LiveKit Cloud
LiveKit Python SDK
PyTorch
OpenCV or Pillow
```

undecided on if we need a framework

### Performance Target

The realistic goal is:

```text
30 FPS camera preview
live detection updates as fast as the server/model can produce them
```

LiveKit should be able to carry a 30 FPS phone camera stream. The harder
question is whether the `.pt` model and server pipeline can infer at 30 FPS.
We should measure stream FPS, inference time, and end-to-end detection latency.

### High-Level Architecture

```text
RipSnap React Native app
  Remote Detection screen
    owns camera preview
    owns streaming connection
    draws live detection overlay
    native app provides auth/GPS/upload flow

Remote inference server
  receives LiveKit/WebRTC video stream
  runs .pt model
  returns detections

Firebase
  stores uploaded media + metadata
```

## Embedded Web UX

The WebView should feel like a native mode inside RipSnap.

### Connection States

```text
Disconnected
Connecting
Live
Reconnecting
Server unavailable
Poor network
```

### Capture Flow

```text
1. User taps Capture in embedded web app.
2. Web app freezes current frame and current detections.
3. Web app sends capture payload to React Native via postMessage.
4. Native takes over in existing review and upload flow
```

## Responsibility Boundaries

### Web App Owns

- Camera preview
- Remote streaming
- Detection overlay
- Remote model controls
- Latency display
- Capture frame extraction

### Native App Owns

- App navigation
- Firebase auth
- GPS location
- Upload metadata
- Review form
- Offline/local TFLite mode
- Settings tab

### Server Owns

- `.pt` model loading
- Preprocessing
- Inference
- Postprocessing
- Model version reporting
- Health checks

## MVP Features

- Embedded WebView remote detection mode
- Camera preview in web app
- Live server detections
- Capture button for images or video
- Native review/upload handoff
- GPS metadata from native app
- Notes stored in Firestore and metadata JSON
- Remote model name/version in metadata
- Connection and latency indicators
- Threshold and max result controls
- Server can handle a small amount of users concurrently

## Concerns

### Camera in WebView

Mobile browser camera APIs work well in Safari/Chrome, but embedded WebView
behavior needs testing on both iOS and Android.

### Latency

Server inference time, upload bandwidth, and frame size determine UX quality.
The prototype should measure round-trip latency from day one.

### Server and Network Work

The mobile/web app is only part of the system. Remote detection also requires:

- GPU server setup for PyTorch inference
- LiveKit deployment or LiveKit Cloud configuration
- secure token/session creation
- model loading and versioning
- frame decoding/preprocessing
- inference queue/backpressure
- reconnect and timeout behavior
- basic monitoring for FPS, latency, and server errors

## Cloud Build

First-time development build:

```sh
eas build --profile development --platform android
```

Or:

```sh
eas build --profile development --platform ios
```

## Build Locally

```sh
yarn expo run:android
```

Or:

```sh
yarn expo run:ios
```

## General Dev

```sh
yarn start
```

## Notes

You need `google-services.json` and `GoogleService-Info.plist` in the root
directory, plus the project `.env` file.

## Admin Access

Admin-layer uploads are protected by a Firebase Authentication custom claim.
An administrator must have the following claim in their Firebase ID token:

```json
{
  "admin": true
}
```

The claim is managed outside the mobile app. Do not add `admin` to a Firestore
user profile: users can update their own profile documents, while custom claims
are enforced by Firestore and Storage rules.

### Grant or Revoke Admin Access

Set `GOOGLE_APPLICATION_CREDENTIALS` to a trusted Firebase service-account JSON
file, then build the Functions utilities:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
npm.cmd --prefix functions run build
```

Grant access by Firebase Auth email:

```powershell
node functions/lib/scripts/setAdminClaim.js --email admin@example.com --admin true
```

The same command accepts `--uid` instead of `--email`. Revoke access with
`--admin false`. The user must sign out and back in after a claim change so the
mobile app receives a refreshed ID token.

### Deploy Firebase Rules

The mobile app hides the Admin upload option for non-admins, but Firebase rules
are the authoritative security boundary. Deploy the current Firestore and
Storage rules to the configured project before using Admin uploads in a shared
environment:

```sh
firebase deploy --only firestore:rules,storage
```

All authenticated users can still read the Admin map layer. Admin-layer
deletion is not enabled yet; deletion remains owner-only until the admin delete
workflow is implemented.
