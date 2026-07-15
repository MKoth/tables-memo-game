import { useCallback } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

export type ThrottledClock = {
  clock: SharedValue<number>;
  setActive: (active: boolean) => void;
};

/**
 * Returns a SharedValue<number> that advances in discrete steps at `fps`,
 * so dependent Skia canvases only repaint at that rate instead of every vsync.
 * Value unit is milliseconds relative to first frame (same as useClock).
 *
 * Using relative time matters: shaders feed iTime into hash functions
 * that break (NaN) when the absolute system timestamp makes the inputs
 * overflow float32 precision.
 *
 * The frame callback skips work between quantized steps (including on 120 Hz
 * ProMotion) and can be paused via `setActive(false)`.
 */
export function useThrottledClock(fps: number, autostart = true): ThrottledClock {
  const clock = useSharedValue(0);
  const origin = useSharedValue(-1);
  const lastProcessed = useSharedValue(-1);
  const step = 1000 / fps;

  const onFrame = useCallback(
    (info: { timestamp: number }) => {
      'worklet';
      if (lastProcessed.value !== -1 && info.timestamp - lastProcessed.value < step) {
        return;
      }
      lastProcessed.value = info.timestamp;

      if (origin.value === -1) {
        origin.value = info.timestamp;
      }
      const elapsed = info.timestamp - origin.value;
      const quantized = Math.floor(elapsed / step) * step;
      if (clock.value !== quantized) {
        clock.value = quantized;
      }
    },
    [clock, origin, lastProcessed, step],
  );

  const frameCallback = useFrameCallback(onFrame, autostart);

  return { clock, setActive: frameCallback.setActive };
}
