import type { SharedValue } from 'react-native-reanimated';
import { BubblePhase } from './useBubbleAnimation';
import type { FishRuntime } from './koiFishTypes';

export type PoolReleaseCaptureState = {
  capturedFishIndex: SharedValue<number>;
  bubblePhase: SharedValue<number>;
};

/** Release captured fish into the pool at its current position and motion. */
export function releaseCapturedFishWorklet(
  fishIndex: number,
  runtime: FishRuntime,
  sharedPositions: SharedValue<number[]>,
  captureState: PoolReleaseCaptureState,
): void {
  'worklet';
  if (fishIndex < 0) {
    return;
  }

  const pos = sharedPositions.value;
  pos[fishIndex * 2] = runtime.x.value;
  pos[fishIndex * 2 + 1] = runtime.y.value;
  sharedPositions.value = pos;
  captureState.capturedFishIndex.value = -1;
  captureState.bubblePhase.value = BubblePhase.None;
}
