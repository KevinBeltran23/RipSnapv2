/** DetectionStats — "Objects: N" HUD pill at the bottom of the camera view. */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DetectionStatsProps {
  count: number;
}

function DetectionStats({ count }: DetectionStatsProps) {
  return (
    <View style={s.container}>
      <Text style={s.text}>Tap to switch camera • YOLO Object Detection</Text>
      <Text style={s.count}>Objects: {count}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  text: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  count: {
    color: 'white',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
});

export default DetectionStats;
