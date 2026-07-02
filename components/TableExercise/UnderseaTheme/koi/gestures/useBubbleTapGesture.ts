import { useCallback } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import {
  BubblePhase,
  BurstIntent,
  isTapInsideBubble,
  type BubbleAnimState,
  type BurstIntentValue,
} from '../useBubbleAnimation';

const TAP_MAX_DISTANCE_PX = 10;

type UseBubbleTapGestureParams = {
  anim: SharedValue<BubbleAnimState>;
  phase: SharedValue<number>;
  escapeActive?: SharedValue<boolean>;
  startBurst: (intent?: BurstIntentValue) => void;
};

export function useBubbleTapGesture({
  anim,
  phase,
  escapeActive,
  startBurst,
}: UseBubbleTapGestureParams) {
  const handleBurst = useCallback(() => {
    startBurst(BurstIntent.Release);
  }, [startBurst]);

  return useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: (e) => {
      'worklet';
      if (phase.value !== BubblePhase.Idle) {
        return;
      }
      if (escapeActive != null && escapeActive.value) {
        return;
      }
      if (!isTapInsideBubble(e.x, e.y, anim.value)) {
        return;
      }
      scheduleOnRN(handleBurst);
    },
  });
}
