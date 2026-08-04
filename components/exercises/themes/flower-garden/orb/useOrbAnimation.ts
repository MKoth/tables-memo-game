import { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { SharedValue } from 'react-native-reanimated';
import {
  ORB_BURST_DURATION_MS,
  ORB_ENTER_DURATION_MS,
  ORB_IDLE_CLOCK_SPAN_MS,
} from './orbAnimPresets';
import { computeOrbAnimState, type OrbWrongStateInput } from './orbAnimWorklets';
import {
  BurstIntent,
  OrbPhase,
  type BurstIntentValue,
  type OrbAnimationConfig,
  type PetalRingConfig,
  type PetalSpawnConfig,
  type UseOrbAnimationResult,
} from './orbAnimTypes';

export function startOrbIdleClock(idleElapsedMs: SharedValue<number>): void {
  'worklet';
  idleElapsedMs.value = 0;
  idleElapsedMs.value = withTiming(ORB_IDLE_CLOCK_SPAN_MS, {
    duration: ORB_IDLE_CLOCK_SPAN_MS,
    easing: Easing.linear,
    reduceMotion: ReduceMotion.Never,
  });
}

export type OrbWrongState = {
  /** Wrong-feedback progress (0–1) driven by the caller, e.g. a wrong tap. */
  wrongProgress: SharedValue<number>;
  /** Monotonic clock (ms) driving the shake oscillation. */
  clock: SharedValue<number>;
  /** Tint color channels (0–1) shown while wrong. */
  tintR: number;
  tintG: number;
  tintB: number;
};

export function useOrbAnimation(
  config: OrbAnimationConfig,
  rings: ReadonlyArray<PetalRingConfig>,
  petals: ReadonlyArray<PetalSpawnConfig>,
  onDismiss: () => void,
  enabled = true,
  onBurstCompleteWorklet?: (burstIdleTimeMs: number, intent: BurstIntentValue) => void,
  wrongState?: OrbWrongState,
): UseOrbAnimationResult {
  const enterProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const idleElapsedMs = useSharedValue(0);
  const burstIdleTimeMs = useSharedValue(0);
  const burstStartRealTimeMs = useSharedValue(0);
  const burstIntent = useSharedValue<BurstIntentValue>(BurstIntent.Release);
  const phase = useSharedValue<number>(enabled ? OrbPhase.Enter : OrbPhase.None);
  const configSv = useSharedValue(config);

  useLayoutEffect(() => {
    configSv.value = config;
  }, [config, configSv]);

  const wrongSnapshot = useDerivedValue<OrbWrongStateInput>(
    () => ({
      progress: wrongState?.wrongProgress.value ?? 0,
      clockMs: wrongState?.clock.value ?? 0,
      r: wrongState?.tintR ?? 1,
      g: wrongState?.tintG ?? 0.35,
      b: wrongState?.tintB ?? 0.35,
    }),
    [wrongState],
  );

  const anim = useDerivedValue(() =>
    computeOrbAnimState(
      phase.value,
      enterProgress.value,
      burstProgress.value,
      phase.value === OrbPhase.Burst ? burstIdleTimeMs.value : idleElapsedMs.value,
      configSv.value,
      rings,
      petals,
      wrongSnapshot.value,
    ),
  );

  useEffect(() => {
    cancelAnimation(enterProgress);
    cancelAnimation(burstProgress);
    cancelAnimation(idleElapsedMs);

    if (!enabled) {
      enterProgress.value = 0;
      burstProgress.value = 0;
      idleElapsedMs.value = 0;
      burstIdleTimeMs.value = 0;
      phase.value = OrbPhase.None;
      return;
    }

    enterProgress.value = 0;
    burstProgress.value = 0;
    idleElapsedMs.value = 0;
    phase.value = OrbPhase.Enter;

    const currentConfig = configSv.value;
    if (currentConfig.skipEnter === true) {
      enterProgress.value = 1;
      startOrbIdleClock(idleElapsedMs);
      phase.value = OrbPhase.Idle;
    } else {
      enterProgress.value = withDelay(
        currentConfig.enterDelayMs ?? 0,
        withTiming(
          1,
          { duration: ORB_ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) },
          finished => {
            'worklet';
            if (finished) {
              startOrbIdleClock(idleElapsedMs);
              phase.value = OrbPhase.Idle;
            }
          },
        ),
      );
    }

    return () => {
      cancelAnimation(enterProgress);
      cancelAnimation(burstProgress);
      cancelAnimation(idleElapsedMs);
    };
  }, [enabled, enterProgress, burstProgress, idleElapsedMs, phase, burstIdleTimeMs, configSv]);

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release) => {
      if (phase.value === OrbPhase.None || phase.value === OrbPhase.Burst) {
        return;
      }
      if (phase.value === OrbPhase.Enter) {
        cancelAnimation(enterProgress);
        enterProgress.value = 1;
      }
      burstIntent.value = intent;
      burstIdleTimeMs.value = idleElapsedMs.value;
      cancelAnimation(idleElapsedMs);
      burstStartRealTimeMs.value = Date.now();
      phase.value = OrbPhase.Burst;
      burstProgress.value = 0;
      burstProgress.value = withDelay(
        configSv.value.popDelayMs ?? 0,
        withTiming(
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
        ),
      );
    },
    [
      burstIdleTimeMs,
      burstIntent,
      burstProgress,
      configSv,
      enterProgress,
      idleElapsedMs,
      onDismiss,
      onBurstCompleteWorklet,
      phase,
      burstStartRealTimeMs,
    ],
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
