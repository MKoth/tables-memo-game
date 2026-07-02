import { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  BUBBLE_BURST_DURATION_MS,
  BUBBLE_ENTER_DURATION_MS,
} from '../bubbleAnimPresets';
import { computeBubbleAnimState } from './bubbleAnimWorklets';
import {
  BubblePhase,
  BurstIntent,
  type BubbleAnimationConfig,
  type BurstIntentValue,
  type UseBubbleAnimationResult,
} from './bubbleAnimTypes';

export function useBubbleAnimation(
  config: BubbleAnimationConfig,
  onDismiss: (intent: BurstIntentValue) => void,
  enabled = true,
  onBurstCompleteWorklet?: () => void,
): UseBubbleAnimationResult {
  const enterProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const burstIntent = useSharedValue<BurstIntentValue>(BurstIntent.Release);
  const phase = useSharedValue<number>(enabled ? BubblePhase.Enter : BubblePhase.None);
  const configSv = useSharedValue(config);

  useLayoutEffect(() => {
    configSv.value = config;
  }, [config, configSv]);

  const anim = useDerivedValue(() =>
    computeBubbleAnimState(
      phase.value,
      enterProgress.value,
      burstProgress.value,
      configSv.value,
    ),
  );

  useEffect(() => {
    cancelAnimation(enterProgress);
    cancelAnimation(burstProgress);

    if (!enabled) {
      enterProgress.value = 0;
      burstProgress.value = 0;
      phase.value = BubblePhase.None;
      return;
    }

    enterProgress.value = 0;
    burstProgress.value = 0;
    phase.value = BubblePhase.Enter;

    enterProgress.value = withTiming(
      1,
      { duration: BUBBLE_ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) },
      finished => {
        if (finished) {
          phase.value = BubblePhase.Idle;
        }
      },
    );

    return () => {
      cancelAnimation(enterProgress);
      cancelAnimation(burstProgress);
    };
  }, [enabled, enterProgress, burstProgress, phase]);

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release) => {
      if (phase.value !== BubblePhase.Idle) {
        return;
      }
      burstIntent.value = intent;
      phase.value = BubblePhase.Burst;
      burstProgress.value = 0;
      burstProgress.value = withTiming(
        1,
        { duration: BUBBLE_BURST_DURATION_MS, easing: Easing.out(Easing.cubic) },
        finished => {
          'worklet';
          if (finished) {
            const completedIntent = burstIntent.value;
            if (completedIntent === BurstIntent.Release) {
              onBurstCompleteWorklet?.();
            }
            scheduleOnRN(onDismiss, completedIntent);
          }
        },
      );
    },
    [burstIntent, burstProgress, onBurstCompleteWorklet, onDismiss, phase],
  );

  return { anim, phase, enterProgress, startBurst };
}

export {
  BubblePhase,
  BurstIntent,
  type BubbleAnimState,
  type BubbleAnimationConfig,
  type BurstIntentValue,
  type UseBubbleAnimationResult,
} from './bubbleAnimTypes';

export { isTapInsideBubble } from './bubbleAnimWorklets';
