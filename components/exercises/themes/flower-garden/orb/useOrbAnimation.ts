import { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  ORB_BURST_DURATION_MS,
  ORB_ENTER_DURATION_MS,
} from './orbAnimPresets';
import { computeOrbAnimState } from './orbAnimWorklets';
import {
  BurstIntent,
  OrbPhase,
  type BurstIntentValue,
  type OrbAnimationConfig,
  type PetalRingConfig,
  type PetalSpawnConfig,
  type UseOrbAnimationResult,
} from './orbAnimTypes';

export function useOrbAnimation(
  config: OrbAnimationConfig,
  rings: ReadonlyArray<PetalRingConfig>,
  petals: ReadonlyArray<PetalSpawnConfig>,
  onDismiss: () => void,
  enabled = true,
  onBurstCompleteWorklet?: (burstIdleTimeMs: number, intent: BurstIntentValue) => void,
): UseOrbAnimationResult {
  const enterProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const idleElapsedMs = useSharedValue(0);
  const burstIdleTimeMs = useSharedValue(0);
  const burstStartRealTimeMs = useSharedValue(0);
  const burstIntent = useSharedValue<BurstIntentValue>(BurstIntent.Release);
  const phase = useSharedValue<number>(enabled ? OrbPhase.Enter : OrbPhase.None);
  const configSv = useSharedValue(config);
  const lastFrameMs = useSharedValue(-1);

  useLayoutEffect(() => {
    configSv.value = config;
  }, [config, configSv]);

  useFrameCallback(frameInfo => {
    const phaseNow = phase.value;
    if (phaseNow !== OrbPhase.Idle) {
      lastFrameMs.value = -1;
      return;
    }
    const currentMs = frameInfo.timestamp;
    if (lastFrameMs.value < 0) {
      lastFrameMs.value = currentMs;
      return;
    }
    const delta = currentMs - lastFrameMs.value;
    lastFrameMs.value = currentMs;
    if (delta > 0) {
      idleElapsedMs.value = idleElapsedMs.value + delta;
    }
  }, true);

  const anim = useDerivedValue(() =>
    computeOrbAnimState(
      phase.value,
      enterProgress.value,
      burstProgress.value,
      phase.value === OrbPhase.Burst ? burstIdleTimeMs.value : idleElapsedMs.value,
      configSv.value,
      rings,
      petals,
    ),
  );

  useEffect(() => {
    cancelAnimation(enterProgress);
    cancelAnimation(burstProgress);

    if (!enabled) {
      enterProgress.value = 0;
      burstProgress.value = 0;
      idleElapsedMs.value = 0;
      burstIdleTimeMs.value = 0;
      lastFrameMs.value = -1;
      phase.value = OrbPhase.None;
      return;
    }

    enterProgress.value = 0;
    burstProgress.value = 0;
    idleElapsedMs.value = 0;
    lastFrameMs.value = -1;
    phase.value = OrbPhase.Enter;

    enterProgress.value = withTiming(
      1,
      { duration: ORB_ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) },
      finished => {
        'worklet';
        if (finished) {
          idleElapsedMs.value = 0;
          phase.value = OrbPhase.Idle;
        }
      },
    );

    return () => {
      cancelAnimation(enterProgress);
      cancelAnimation(burstProgress);
    };
  }, [enabled, enterProgress, burstProgress, idleElapsedMs, phase, burstIdleTimeMs]);

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release) => {
      if (phase.value !== OrbPhase.Idle) {
        return;
      }
      burstIntent.value = intent;
      burstIdleTimeMs.value = idleElapsedMs.value;
      burstStartRealTimeMs.value = Date.now();
      phase.value = OrbPhase.Burst;
      burstProgress.value = 0;
      burstProgress.value = withTiming(
        1,
        { duration: ORB_BURST_DURATION_MS, easing: Easing.out(Easing.cubic) },
        finished => {
          'worklet';
          if (finished) {
            if (onBurstCompleteWorklet) {
              onBurstCompleteWorklet(burstStartRealTimeMs.value, burstIntent.value);
            }
            scheduleOnRN(onDismiss);
          }
        },
      );
    },
    [burstIdleTimeMs, burstIntent, burstProgress, idleElapsedMs, onDismiss, onBurstCompleteWorklet, phase, burstStartRealTimeMs],
  );

  return { anim, phase, startBurst };
}

export {
  BurstIntent,
  OrbPhase,
  type BurstIntentValue,
  type OrbAnimState,
  type OrbAnimationConfig,
  type PetalAnimState,
  type PetalRingConfig,
  type PetalSpawnConfig,
  type UseOrbAnimationResult,
} from './orbAnimTypes';
