import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Returns a SharedValue<number> that advances in discrete steps at `fps`,
 * so dependent Skia canvases only repaint at that rate instead of 60fps.
 * Value unit is milliseconds relative to first frame (same as useClock).
 *
 * Using relative time matters: shaders feed iTime into hash functions
 * that break (NaN) when the absolute system timestamp makes the inputs
 * overflow float32 precision.
 */
export function useThrottledClock(fps: number): SharedValue<number> {
  const clock = useSharedValue(0);
  const origin = useSharedValue(-1);
  const step = 1000 / fps;

  useFrameCallback((info) => {
    'worklet';
    if (origin.value === -1) {
      origin.value = info.timestamp;
    }
    const elapsed = info.timestamp - origin.value;
    const quantized = Math.floor(elapsed / step) * step;
    if (clock.value !== quantized) {
      clock.value = quantized;
    }
  });

  return clock;
}
