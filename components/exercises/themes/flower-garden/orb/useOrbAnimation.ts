import { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedReaction,
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

function enterIdle(
  phase: SharedValue<number>,
  idleClock: SharedValue<number> | undefined,
  idleClockStartMs: SharedValue<number>,
  idleElapsedMs: SharedValue<number>,
): void {
  'worklet';
  if (idleClock != null) {
    idleClockStartMs.value = idleClock.value;
  } else {
    startOrbIdleClock(idleElapsedMs);
  }
  phase.value = OrbPhase.Idle;
}

export function currentIdleElapsedMs(
  phase: number,
  idleClock: SharedValue<number> | undefined,
  idleClockStartMs: SharedValue<number>,
  idleElapsedMs: SharedValue<number>,
): number {
  'worklet';
  if (idleClock != null) {
    if (phase === OrbPhase.Idle) {
      return Math.max(0, idleClock.value - idleClockStartMs.value);
    }
    return 0;
  }
  return idleElapsedMs.value;
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
  onDismiss: () => void,
  enabled = true,
  onBurstCompleteWorklet?: (burstIdleTimeMs: number, intent: BurstIntentValue) => void,
  wrongState?: OrbWrongState,
  idleClock?: SharedValue<number>,
  retargetEnter?: SharedValue<{ skipEnter: boolean; enterDelayMs: number | null } | null>,
): UseOrbAnimationResult {
  const enterProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const idleElapsedMs = useSharedValue(0);
  const idleClockStartMs = useSharedValue(0);
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

  const resolvedIdleElapsedMs = useDerivedValue(() =>
    currentIdleElapsedMs(phase.value, idleClock, idleClockStartMs, idleElapsedMs),
  );

  const anim = useDerivedValue(() =>
    computeOrbAnimState(
      phase.value,
      enterProgress.value,
      burstProgress.value,
      phase.value === OrbPhase.Burst ? burstIdleTimeMs.value : resolvedIdleElapsedMs.value,
      configSv.value,
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
      idleClockStartMs.value = 0;
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
      enterIdle(phase, idleClock, idleClockStartMs, idleElapsedMs);
    } else {
      enterProgress.value = withDelay(
        currentConfig.enterDelayMs ?? 0,
        withTiming(
          1,
          { duration: ORB_ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) },
          finished => {
            'worklet';
            if (finished) {
              enterIdle(phase, idleClock, idleClockStartMs, idleElapsedMs);
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
  }, [
    enabled,
    enterProgress,
    burstProgress,
    idleElapsedMs,
    idleClockStartMs,
    idleClock,
    phase,
    burstIdleTimeMs,
    configSv,
  ]);

  useAnimatedReaction(
    () => retargetEnter?.value,
    (target, prev) => {
      if (retargetEnter == null || target == null || prev === target || !enabled) {
        return;
      }
      cancelAnimation(enterProgress);
      cancelAnimation(burstProgress);
      if (target.skipEnter) {
        enterProgress.value = 1;
        enterIdle(phase, idleClock, idleClockStartMs, idleElapsedMs);
        return;
      }
      enterProgress.value = 0;
      phase.value = OrbPhase.Enter;
      enterProgress.value = withDelay(
        target.enterDelayMs ?? 0,
        withTiming(
          1,
          { duration: ORB_ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) },
          finished => {
            'worklet';
            if (finished) {
              enterIdle(phase, idleClock, idleClockStartMs, idleElapsedMs);
            }
          },
        ),
      );
    },
    [
      burstProgress,
      enabled,
      enterProgress,
      idleClock,
      idleClockStartMs,
      idleElapsedMs,
      phase,
      retargetEnter,
    ],
  );

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release, popDelayMs?: number) => {
      if (phase.value === OrbPhase.None || phase.value === OrbPhase.Burst) {
        return;
      }
      if (phase.value === OrbPhase.Enter) {
        cancelAnimation(enterProgress);
        enterProgress.value = 1;
      }
      burstIntent.value = intent;
      burstIdleTimeMs.value = currentIdleElapsedMs(
        phase.value,
        idleClock,
        idleClockStartMs,
        idleElapsedMs,
      );
      cancelAnimation(idleElapsedMs);
      burstStartRealTimeMs.value = Date.now();
      phase.value = OrbPhase.Burst;
      burstProgress.value = 0;
      burstProgress.value = withDelay(
        configSv.value.popDelayMs ?? popDelayMs ?? 0,
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
      idleClockStartMs,
      idleClock,
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
  type UseOrbAnimationResult,
} from './orbAnimTypes';
