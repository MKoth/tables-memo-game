import { useLayoutEffect, useRef } from 'react';
import {
  Easing,
  type SharedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export function useMergeProgress(
  durationMs: number,
  onComplete?: () => void,
): SharedValue<number> {
  const mergeProgress = useSharedValue(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    mergeProgress.value = 0;
    mergeProgress.value = withTiming(
      1,
      { duration: durationMs, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        'worklet';
        const callback = onCompleteRef.current;
        if (finished && callback != null) {
          scheduleOnRN(callback);
        }
      },
    );
  }, [durationMs, mergeProgress]);

  return mergeProgress;
}
