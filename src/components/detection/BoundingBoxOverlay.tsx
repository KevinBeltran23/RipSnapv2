/**
 * BoundingBoxOverlay — Skia Canvas component that draws detection boxes.
 * Used by LiveDetectionScreen over the camera view.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Rect,
  Text as SkiaText,
  type SkFont,
} from '@shopify/react-native-skia';

interface BoundingBox {
  id: number;
  rect: { x: number; y: number; width: number; height: number };
  label: string;
  confidence: number;
}

interface BoundingBoxOverlayProps {
  boxes: BoundingBox[];
  font: SkFont;
  detectionCount: number;
}

function BoundingBoxOverlay({
  boxes,
  font,
  detectionCount,
}: BoundingBoxOverlayProps) {
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {boxes.map(box => (
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

      {/* Detection count HUD */}
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
  );
}

export default BoundingBoxOverlay;
export type { BoundingBox };
