import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useExerciseRuntime } from '../core/providers/ExerciseRuntimeProvider';

const CAPTURE_OVERLAY_Z = 3;
const ESCAPE_OVERLAY_Z = 10;

export function CaptureOverlay() {
  const { captureBridge } = useExerciseRuntime();

  if (captureBridge?.overlay == null) {
    return null;
  }

  return (
    <View
      style={[
        styles.captureOverlay,
        {
          zIndex: captureBridge.escapeOverlayActive
            ? ESCAPE_OVERLAY_Z
            : CAPTURE_OVERLAY_Z,
        },
      ]}
      pointerEvents={captureBridge.escapeOverlayActive ? 'none' : 'box-none'}>
      {captureBridge.overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  captureOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'visible',
  },
});
